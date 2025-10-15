(function(hello) {

	hello.init({

		linkedin: {

			oauth: {
				version: 2,
				response_type: 'code',
				auth: 'https://www.linkedin.com/oauth/v2/authorization',
				grant: 'https://www.linkedin.com/oauth/v2/accessToken'
			},

			// Refresh the access_token once expired
			refresh: true,
			
			// LinkedIn-specific login parameters
			login: function(p) {
				// Ensure proper LinkedIn OAuth2 parameters
				if (p.qs) {
					// LinkedIn requires specific state parameter format
					if (typeof p.qs.state === 'object') {
						p.qs.state.oauth_proxy = p.qs.state.oauth_proxy || 'https://auth-server.herokuapp.com/proxy';
					}
				}
			},

			scope: {
				basic: 'r_liteprofile',
				email: 'r_emailaddress',
				files: '',
				friends: '',
				photos: '',
				publish: 'w_member_social',
				publish_files: 'w_member_social',
				share: 'w_member_social',
				videos: '',
				offline_access: ''
			},
			scope_delim: ' ',

			base: 'https://api.linkedin.com/v2/',

			get: {
				me: 'people/~:(id,firstName,lastName,profilePicture(displayImage~:playableStreams))',
				'me/email': 'emailAddress?q=members&projection=(elements*(handle~))',

				// See: LinkedIn v2 API documentation
				'me/share': 'shares?q=owners&owners=@{owner|urn:li:person:~}&count=@{limit|250}'
			},

			post: {

				// See: LinkedIn v2 API documentation for shares
				'me/share': function(p, callback) {
					var data = {
						author: 'urn:li:person:' + (p.authResponse.user_id || '~'),
						lifecycleState: 'PUBLISHED',
						specificContent: {
							'com.linkedin.ugc.ShareContent': {
								shareCommentary: {
									text: p.data.message || ''
								},
								shareMediaCategory: 'NONE'
							}
						},
						visibility: {
							'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
						}
					};

					if (p.data.link) {
						data.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
						data.specificContent['com.linkedin.ugc.ShareContent'].media = [{
							status: 'READY',
							description: {
								text: p.data.description || ''
							},
							originalUrl: p.data.link,
							title: {
								text: p.data.title || ''
							}
						}];
					}

					p.data = JSON.stringify(data);

					callback('ugcPosts');
				},

				'me/like': like
			},

			del: {
				'me/like': like
			},

			wrap: {
				me: function(o) {
					formatError(o);
					formatUser(o);
					return o;
				},

				'me/friends': formatFriends,
				'me/following': formatFriends,
				'me/followers': formatFriends,
				'me/share': function(o) {
					formatError(o);
					paging(o);
					if (o.values) {
						o.data = o.values.map(formatUser);
						o.data.forEach(function(item) {
							item.message = item.headline;
						});

						delete o.values;
					}

					return o;
				},

				'default': function(o, headers) {
					formatError(o);
					empty(o, headers);
					paging(o);
				}
			},

			jsonp: function(p, qs) {
				formatQuery(qs);
				if (p.method === 'get') {
					qs.format = 'jsonp';
					qs['error-callback'] = p.callbackID;
				}
			},

			xhr: function(p, qs) {
				if (p.method !== 'get') {
					formatQuery(qs);
					p.headers['Content-Type'] = 'application/json';

					// LinkedIn v2 API headers
					p.headers['LinkedIn-Version'] = '202310';
					p.headers['X-Restli-Protocol-Version'] = '2.0.0';
					p.proxy = true;
					return true;
				}
				
				// For GET requests, add LinkedIn API version headers
				p.headers = p.headers || {};
				p.headers['LinkedIn-Version'] = '202310';
				p.headers['X-Restli-Protocol-Version'] = '2.0.0';
				
				return false;
			}
		}
	});

	function formatError(o) {
		if (o && 'errorCode' in o) {
			o.error = {
				code: o.status || o.errorCode,
				message: o.message
			};
		}
		// Handle LinkedIn v2 API error format
		else if (o && o.error) {
			if (typeof o.error === 'string') {
				o.error = {
					code: o.error,
					message: o.error_description || o.error
				};
			}
		}
		// Handle "Unknown authentication scheme" error specifically
		else if (o && typeof o === 'string' && o.indexOf('Unknown authentication scheme') !== -1) {
			o = {
				error: {
					code: 'invalid_authentication',
					message: 'LinkedIn authentication failed. Please check your client ID and ensure it is registered with the OAuth proxy.'
				}
			};
		}
	}

	function formatUser(o) {
		if (o.error) {
			return;
		}

		// Handle LinkedIn v2 API response format
		if (o.firstName && o.firstName.localized) {
			var locale = Object.keys(o.firstName.localized)[0];
			o.first_name = o.firstName.localized[locale];
		}
		if (o.lastName && o.lastName.localized) {
			var locale = Object.keys(o.lastName.localized)[0];
			o.last_name = o.lastName.localized[locale];
		}
		
		// Fallback for older API format
		o.first_name = o.first_name || o.firstName;
		o.last_name = o.last_name || o.lastName;
		o.name = o.formattedName || (o.first_name + ' ' + o.last_name);
		
		// Handle profile picture from v2 API
		if (o.profilePicture && o.profilePicture['displayImage~'] && o.profilePicture['displayImage~'].elements) {
			var elements = o.profilePicture['displayImage~'].elements;
			if (elements.length > 0 && elements[0].identifiers && elements[0].identifiers.length > 0) {
				o.thumbnail = elements[0].identifiers[0].identifier;
			}
		}
		
		// Fallback for older API format
		o.thumbnail = o.thumbnail || o.pictureUrl;
		o.email = o.emailAddress;
		return o;
	}

	function formatFriends(o) {
		formatError(o);
		paging(o);
		if (o.values) {
			o.data = o.values.map(formatUser);
			delete o.values;
		}

		return o;
	}

	function paging(res) {
		if ('_count' in res && '_start' in res && (res._count + res._start) < res._total) {
			res.paging = {
				next: '?start=' + (res._start + res._count) + '&count=' + res._count
			};
		}
	}

	function empty(o, headers) {
		if (JSON.stringify(o) === '{}' && headers.statusCode === 200) {
			o.success = true;
		}
	}

	function formatQuery(qs) {
		// LinkedIn v2 API uses standard 'access_token' parameter
		// Keep the access_token as is for v2 API compatibility
		// No need to rename to oauth2_access_token for v2 API
	}

	function like(p, callback) {
		p.headers['x-li-format'] = 'json';
		var id = p.data.id;
		p.data = (p.method !== 'delete').toString();
		p.method = 'put';
		callback('people/~/network/updates/key=' + id + '/is-liked');
	}

})(hello);
