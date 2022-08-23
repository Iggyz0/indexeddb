var useIndexeddb = true;
const dbName = "NotesDB";
const dbVersion = 1;

(function() {

	handleIndexedDbRequest("view");

	document.getElementById("dark-mode-checkbox").addEventListener("change", function(){
		if (this.checked) {
			doDarkTheme();

			setLocalStorageItem("theme", "dark");
		}
		else {
			doLightTheme();

			setLocalStorageItem("theme", "light");
		}
	});

	setTimeout(function() {
		// check localstorage settings
		doTheme();
	}, 200);

})();

function getLocalStorageItem(key) {
	return localStorage.getItem(key);
}

function setLocalStorageItem(key, value) {
	localStorage.setItem(key, value);
}

function handleIndexedDbRequest(command, ...args) {

	command = command.trim().toLowerCase();
	
	if (!window.indexedDB) {
		console.log(`Your browser doesn't support IndexedDB`);
		this.useIndexeddb = false;
		return false;
	}
	
	this.useIndexeddb = true;

	const request = indexedDB.open(dbName, dbVersion);

	request.onerror = (event) => {
		console.error(`Database error: ${event.target.errorCode}`);
		useIndexeddb = false;
	};

	request.onsuccess = (event) => {
		const db = event.target.result;
		useIndexeddb = true;

		if ( command == 'add' ) {
			var transac = db.transaction("notes", "readwrite").objectStore("notes");
			transac.add(args[0]).onsuccess = (e) => {
				console.log(`Note added.`);
			};

			transac.oncomplete = function () {
				db.close();
			};
			handleIndexedDbRequest("view");
		}
		else if ( command == 'edit' ) {
			var transac = db.transaction("notes", "readwrite").objectStore("notes");

			transac.get(Number(args[0].id)).onsuccess = (event) => {
				const oneNote = event.target.result;
				oneNote.title = args[0].title;
				oneNote.content = args[0].content;
				oneNote.date_updated = args[0].date_updated;
				transac.put(oneNote).onsuccess = (e) => {
					console.log(`Note edited`);
				};
			};

			transac.oncomplete = function () {
				db.close();
			};
			handleIndexedDbRequest("view");
		}
		else if ( command == 'delete' ) {
			var transac = db.transaction("notes", "readwrite").objectStore("notes").delete(Number(args[0]));
			transac.onerror = (event) => { console.error(event.target.errorCode); }
			transac.onsuccess = (event) => { console.log("Deleted note with id: " + Number(args[0])); }

			transac.oncomplete = function () {
				db.close();
			};
			handleIndexedDbRequest("view");
		}
		else if ( command == 'search' ) {
			var transac = db.transaction("notes", "readonly").objectStore("notes");
			transac.getAll().onsuccess = (event) => {
				const allNotes = event.target.result;
				const search = args[0];
				arr = allNotes.filter(obj => { 
					return (obj.title.toLowerCase().includes(search) || ( obj.content ? obj.content.toLowerCase().includes(search) : null) ); 
				});
				populateNotesIntoHtml(arr, true);
			};

			transac.oncomplete = function () {
				db.close();
			};
		}
		else if ( command == 'delete_all' ) {
			var transac = db.transaction("notes", "readwrite").objectStore("notes").clear();
			transac.onsuccess = (event) => { 
				console.log(`Successfully cleared database.`); 
				populateNotesIntoHtml([], false);
			};
			transac.onerror = (event) => { console.error(event.target.errorCode); }

			transac.oncomplete = function () {
				db.close();
			};
		}
		else {
			var transac = db.transaction("notes", "readonly").objectStore("notes");
			transac.getAll().onsuccess = (event) => {
				const allNotes = event.target.result;
				populateNotesIntoHtml(allNotes, true);
			};

			transac.oncomplete = function () {
				db.close();
			};
		}

	};

	request.onupgradeneeded = (event) => {
		let db = event.target.result;

		switch (event.oldVersion) {
			case 0: {
				const objectStore = db.createObjectStore("notes", { keyPath: "id", autoIncrement: true });
				objectStore.createIndex("title", "title", { unique: false });
				objectStore.createIndex("content", "content", { unique: false });
				objectStore.createIndex("date_updated", "date_updated", { unique: false });
			}
			case 1: {

			}
				
		}

		useIndexeddb = true;
	};

	return useIndexeddb;
}

function populateNotesIntoHtml(notes, checkThemeAgain) {
	var notesContainer = document.getElementById('notes-container');
	while(notesContainer.firstChild){
		notesContainer.removeChild(notesContainer.firstChild);
	}

	var newNotesHtml = ``;

	if ( notes.length > 0 ) {

		notes.forEach(element => {
	
			newNotesHtml += `<div class="card">
									<div class="card-body card-custom">
										<h5 class="card-title">${element.title}</h5>
										<h6 class="card-subtitle mb-2 text-muted">note</h6>
										<h6 class="card-subtitle mb-2 text-muted">${element.date_updated}</h6>
										<p class="card-text">${element.content}</p>
										<div class="card-bottom-links">
											<p class="card-link card-links-text" onclick="editNote(${element.id}, '${element.title}', '${element.content}');">Edit</p>
											<p class="card-link card-links-text" onclick="deleteNote(${element.id});">Delete</p>
										</div>
									</div>
							</div>`;		
	
		});
	}
	else {
		newNotesHtml = `<div><p class="h2">No notes found.</p></div>`;
	}

	notesContainer.insertAdjacentHTML("beforeend", newNotesHtml);

	if (checkThemeAgain) {
		// check localstorage settings
		doTheme();
	}
}

function viewAllNotes() {
	if ( !this.useIndexeddb ) {
		console.log(`Your browser doesn't support IndexedDB`);
		return;
	}
}

function submit() {
	
	if ( !this.useIndexeddb ) {
		console.log(`Your browser doesn't support IndexedDB`);
		return;
	}
	
	let errors = "";
	
	let response = document.getElementById("response");
	let noteTitle = document.getElementById("note-title").value;
	let noteContent = document.getElementById("note-content").value;
	let update = document.getElementById("update-note").value;
	
	response.innerHTML = "";
	noteTitle = noteTitle.trim();
	noteContent = noteContent.trim();
	
	if ( noteTitle == "" ) {
		errors += "Note title is required. ";
	}
	if ( noteContent == "" ) {
		errors += "Note content is required. ";
	}
	
	if ( errors == "" ) {
		// response.style.color = "black";
		let today = new Date();
		let dd = today.getDate();
		let mm = today.getMonth()+1; 
		const yyyy = today.getFullYear();
		let hh = today.getHours();
		let min = today.getMinutes();
		
		if (dd < 10) {
			dd = `0${dd}`;
		} 

		if (mm < 10) {
			mm = `0${mm}`;
		} 

		if (hh < 10) {
			hh = `0${hh}`;
		}

		if (min < 10) {
			min = `0${min}`;
		}
		
		today = `${dd}-${mm}-${yyyy} ${hh}:${min}`;

		if ( update == "1" ) {

			const note = {
				id: document.getElementById("update-note-id").value,
				title: noteTitle, 
				content: noteContent,
				date_updated: today
			}

			this.handleIndexedDbRequest("edit", note);

			document.getElementById("note-title").value = "";
			document.getElementById("note-content").value = "";
			document.getElementById("update-note").value = "-1";
			document.getElementById("update-note-id").value = "";

			response.innerHTML = "Note updated on: " + today + ".";
		}
		else {
			const note = {
				title: noteTitle, 
				content: noteContent,
				date_updated: today
			}
	
			this.handleIndexedDbRequest("add", note);
			response.innerHTML = "Note submited on: " + today + ".";
		}
		
	}
	else {
		response.style.color = "red";
		response.innerHTML = errors;
	}
	
}

function editNote(id, title, content) {
	if ( !this.useIndexeddb ) {
		console.log(`Your browser doesn't support IndexedDB`);
		return;
	}

	document.getElementById("note-title").value = title;
	document.getElementById("note-content").value = content;
	document.getElementById("update-note").value = "1";
	document.getElementById("update-note-id").value = id;
}

function deleteNote(id) {
	if ( !this.useIndexeddb ) {
		console.log(`Your browser doesn't support IndexedDB`);
		return;
	}

	this.handleIndexedDbRequest("delete", Number(id));
}

function searchNotes() {
	searchValue = document.getElementById("search-notes").value.trim().toLowerCase();
	handleIndexedDbRequest("search", searchValue);
}

function deleteAll() {
	handleIndexedDbRequest("delete_all");
}

function doTheme() {
	if ( theme = getLocalStorageItem("theme") ) {
		if ( theme.trim() == "dark" ) {
			doDarkTheme();
		}
		else {
			doLightTheme();
		}
	}
}

function doDarkTheme() {
	document.getElementById("dark-mode-checkbox").checked = true;
	if (!document.getElementById("main-container").classList.contains("dark-mode-main"))
	{
		document.getElementById("main-container").classList.add("dark-mode-main");
	}
	if ( !document.getElementById("html-doc").classList.contains("html-doc-dark") )
	{
		document.getElementById("html-doc").classList.add("html-doc-dark")
	}

	let cards = document.getElementsByClassName("card-custom");
	[...cards].forEach((element, index, array) => {
		if (!element.classList.contains("dark-mode-card-custom"))
		{
			element.classList.add("dark-mode-card-custom");
		}
	});

	let inputs = document.querySelectorAll(".custom-form-input");
	inputs.forEach(element => {
		if (!element.classList.contains("dark-mode-card-custom"))
		{
			element.classList.add("dark-mode-card-custom");
		}
	});
}

function doLightTheme() {
	document.getElementById("dark-mode-checkbox").checked = false;
	if (document.getElementById("main-container").classList.contains("dark-mode-main"))
	{
		document.getElementById("main-container").classList.remove("dark-mode-main");
	}
	if ( document.getElementById("html-doc").classList.contains("html-doc-dark") )
	{
		document.getElementById("html-doc").classList.remove("html-doc-dark")
	}

	let cards = document.getElementsByClassName("card-custom");
	[...cards].forEach((element, index, array) => {
		if (element.classList.contains("dark-mode-card-custom"))
		{
			element.classList.remove("dark-mode-card-custom");
		}
	});

	let inputs = document.querySelectorAll(".custom-form-input");
	inputs.forEach(element => {
		if (element.classList.contains("dark-mode-card-custom"))
		{
			element.classList.remove("dark-mode-card-custom");
		}
	});
}