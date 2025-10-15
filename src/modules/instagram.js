(function(hello) {

	hello.init({

		instagram: {

			name: 'Instagram',

			oauth: {
				// See: http://instagram.com/developer/authentication/
				version: 2,
				auth: 'https://www.instagram.com/oauth/authorize/',
				grant: 'https://api.instagram.com/oauth/access_token'
			},

			// Refresh the access_token once expired
			refresh: true,

			scope: {
				basic: 'user_profile',
				photos: 'user_media',
				media: 'user_media',
				profile: 'user_profile',
				email: '',
				share: '',
				publish_files: '',
				files: '',
				videos: '',
				offline_access: ''
			},

			scope_delim: ' ',

			base: 'https://graph.instagram.com/',

			get: {
				me: 'me?fields=id,username,account_type,media_count',
				'me/photos': 'me/media?fields=id,media_type,media_url,thumbnail_url,caption,timestamp&limit=@{limit|25}',
				'me/media': 'me/media?fields=id,media_type,media_url,thumbnail_url,caption,timestamp&limit=@{limit|25}'
			},



			wrap: {
				me: function(o) {

					formatError(o);

					if (o && o.id) {
						// Instagram Basic Display API returns user data directly
						o.name = o.username;
						o.thumbnail = ''; // Profile picture not available in Basic Display API
					}

					return o;
				},

				'me/photos': function(o) {

					formatError(o);
					paging(o);

					if ('data' in o) {
						// Filter for images and videos
						o.data = o.data.filter(function(d) {
							return d.media_type === 'IMAGE' || d.media_type === 'VIDEO' || d.media_type === 'CAROUSEL_ALBUM';
						});

						o.data.forEach(function(d) {
							d.name = d.caption || '';
							d.thumbnail = d.thumbnail_url || d.media_url;
							d.picture = d.media_url;
							d.source = d.media_url;
						});
					}

					return o;
				},

				'me/media': function(o) {

					formatError(o);
					paging(o);

					if ('data' in o) {
						// Filter for images and videos
						o.data = o.data.filter(function(d) {
							return d.media_type === 'IMAGE' || d.media_type === 'VIDEO' || d.media_type === 'CAROUSEL_ALBUM';
						});

						o.data.forEach(function(d) {
							d.name = d.caption || '';
							d.thumbnail = d.thumbnail_url || d.media_url;
							d.picture = d.media_url;
							d.source = d.media_url;
						});
					}

					return o;
				},

				'default': function(o) {
					o = formatError(o);
					paging(o);
					return o;
				}
			},

			// Instagram does not return any CORS Headers
			// So besides JSONP we're stuck with proxy
			xhr: function(p, qs) {

				var method = p.method;
				var proxy = method !== 'get';

				if (proxy) {

					if ((method === 'post' || method === 'put') && p.query.access_token) {
						p.data.access_token = p.query.access_token;
						delete p.query.access_token;
					}

					// No access control headers
					// Use the proxy instead
					p.proxy = proxy;
				}

				return proxy;
			},

			// No form
			form: false
		}
	});

	function formatImage(image) {
		return {
			source: image.url,
			width: image.width,
			height: image.height
		};
	}

	function formatError(o) {
		if (typeof o === 'string') {
			return {
				error: {
					code: 'invalid_request',
					message: o
				}
			};
		}

		if (o && 'meta' in o && 'error_type' in o.meta) {
			o.error = {
				code: o.meta.error_type,
				message: o.meta.error_message
			};
		}

		return o;
	}



	// See: https://developers.facebook.com/docs/instagram-basic-display-api/
	function paging(res) {
		if ('paging' in res && res.paging && res.paging.next) {
			// Instagram Basic Display API already uses the correct paging format
			// No transformation needed
		}
	}

})(hello);
