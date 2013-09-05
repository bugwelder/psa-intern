'use strict';

/* Services */

app.factory("FlashService", function($rootScope) {
	return {
		/* type = success | danger | info | warning */
		show: function(message, type) {
			if (typeof type === 'undefined') {
				type = "warning"
			}
			$rootScope.flash = {
				message: message,
				type: type
			};
		},
		clear: function() {
			$rootScope.flash = {};
		}
	};
});

app.factory("SessionService", function() {
	return {
		get: function(key) {
			return sessionStorage.getItem(key);
		},
		set: function(key, val) {
			return sessionStorage.setItem(key, val);
		},
		unset: function(key) {
			return sessionStorage.removeItem(key);
		},
	};
});

app.factory("AuthenticationService", function($http, $sanitize, SessionService, FlashService, CSRF_TOKEN) {
	var cacheSession = function(data, status, headers, config) {
		SessionService.set('authenticated', true);
		SessionService.set('name', data.name);
		SessionService.set('email', data.email);
		SessionService.set('_id', data._id);
	};

	var uncacheSession = function() {
		SessionService.unset('authenticated');
		SessionService.unset('name');
		SessionService.unset('email');
		SessionService.unset('_id');
	};

	var loginError = function(response) {
		FlashService.show(response.flash, "danger")
	};

	var sanitizeCredentials = function(credentials) {
		return {
			email: $sanitize(credentials.email),
			password: $sanitize(credentials.password),
			_id: $sanitize(credentials._id),
			_csrf: CSRF_TOKEN
		}
	};

	return {
		login: function(credentials) {
			var login = $http.post("/auth/login", sanitizeCredentials(credentials));
			login.success(cacheSession);
			login.success(FlashService.clear);
			login.error(loginError);
			return login;
		},
		logout: function() {
			var logout = $http.get("/auth/logout");
			logout.success(uncacheSession);
			return logout;
		},
		isLoggedIn: function() {
			return SessionService.get('authenticated');
		},
		getUser: function() {
			return {
				name: SessionService.get('name'),
				email: SessionService.get('email'),
				_id: SessionService.get('_id')
			}
		}
	}
});

app.factory("MessageService", function($http, $sanitize, CSRF_TOKEN) {

	var sanitizeMessagePost = function(new_message) {
		return {
			message: $sanitize(new_message.message),
			_csrf: CSRF_TOKEN
		}
	};

	/*
	 * Return messages from mes_a they are not stored in mes_b
	 */
	var not_in = function(mes_a, mes_b) {
		var result = []
		for (var a = 0; a < mes_a.length; a++) {
			var found_id = false;
			for (var b = 0; b < mes_b.length; b++) {
				if(mes_a[a]._id === mes_b[b]._id) {
					found_id = true;
				}
			};
			if(!found_id) {
				result.push(mes_a[a]);
			}
		};
		return result;
	}

	var getLatest = function() {
		return $http.get('/messages/latest');
	};

	/*
	 * use "getLatest()" and saves the new messages they are not curently in "stored_messages"
	 */
	var getNews = function(stored_messages, cb) {
		getLatest().success(function(mes) {
			if(stored_messages === []) {
				cb(null, mes);
			} else {
				cb(null, not_in(mes, stored_messages));
				return;
			}
		});
		return;
	};

	/*
	 * Return new messages processed from server
	 */
	var getNewsFromServer = function() {
		return $http.get('/messages/news');
	};

	var set = function(new_message) {
		var new_message_result = $http.post("/message", sanitizeMessagePost(new_message));
		return new_message_result;
	};

	return {
		getLatest: getLatest,
		getNews: getNews,
		set: set
	}
});

app.factory("UsersService", function($http, $sanitize, CSRF_TOKEN) {

	var sanitizeUser = function(user) {
		return {
			email: $sanitize(user.email),
			password: $sanitize(user.password),
			name: $sanitize(user.name),
			_csrf: CSRF_TOKEN
		}
	};

	var getUsers = function(cb) {
		return $http.get('/users');
/*		return $http.get('/users').success(function(data) {
			if(data.error) {
				cb(data.error, null);
			} else {
				cb(null, data);
				return;
			}
		});*/
	};
	var getUser = function(email, cb) {
		return $http.get('/user/'+email).success(function(data) {
			if(data.error) {
				cb(data.error, null);
			} else {
				cb(null, data);
				return;
			}
		});
	};
	var set = function(new_user) {
		var new_users_result = $http.post("/user", sanitizeUser(new_user));
		return new_users_result;
	};
	return {
		getUsers: getUsers,
		getUser: getUser,
		set: set
	}
});

app.factory("ImageUploadService", function($fileUploader, $sanitize, CSRF_TOKEN) {


	// create a uploader with options
	var uploader = $fileUploader.create({
	    //scope: $scope,                          // to automatically update the html. Default: $rootScope
	    url: 'upload/image',
	    headers: {'x-csrf-token': CSRF_TOKEN},
	    filters: [
	        function (item) {                    // first user filter
	            console.log('filter1');
	            return true;
	        }
	    ]
	});

	// ADDING FILTER

	uploader.filters.push(function (item) { // second user filter
	    console.log('filter2');
	    return true;
	});

	// REGISTER HANDLERS

	uploader.bind('afteraddingfile', function (event, item) {
    console.log('After adding a file', item);
    // Only process image files.
    if (item.file.type.match('image.*')) {
			// Check for the various File API support.
			if (window.File && window.FileReader && window.FileList && window.Blob) {
			  // Great success! All the File APIs are supported.
		    var reader = new FileReader();
				reader.onload = function (e) {
					console.log(e.target.result);
					item.preview = e.target.result;
					uploader.scope.$apply();
				}
				reader.readAsDataURL(item.file);
			} else {
			  console.log('The File APIs are not fully supported in this browser.');
			}
		} else {
			console.log('Only image files supported.');
			item.remove();
		}
	});

	uploader.bind('afteraddingall', function (event, items) {
	    console.log('After adding all files', items);
	});

	uploader.bind('changedqueue', function (event, items) {
	    console.log('Changed queue', items);
	});

	uploader.bind('beforeupload', function (event, item) {
    console.log('Before upload', item);
	});

	uploader.bind('progress', function (event, item, progress) {
	    console.log('Progress: ' + progress);
	});

	uploader.bind('success', function (event, xhr, item) {
	    console.log('Success: ' + xhr.response);
	});

	uploader.bind('complete', function (event, xhr, item) {
	    console.log('Complete: ' + xhr.response);
	});

	uploader.bind('progressall', function (event, progress) {
	    console.log('Total progress: ' + progress);
	});

	uploader.bind('completeall', function (event, items) {
	    console.log('All files are transferred');
	});

	return {
		uploader: uploader
	}
});