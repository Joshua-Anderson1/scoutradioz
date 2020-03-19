const logger = require('log4js').getLogger();
const utilities = require("@firstteam102/scoutradioz-utilities");

require('colors');

var functions = module.exports = {};

functions.authenticate = function(req, res, next) {
	
	var authenticate = async function (accessLevel) {
		
		var isAuthenticated = false;
		
		//Parse number from accessLevel
		accessLevel = parseInt( accessLevel );
		
		//Throw if access level is not a valid number (Programming error)
		if( isNaN(accessLevel) ) throw new Error("req.authenticate: Access level is not a number (Check naming of process.env.ACCESS_X)");
		
		var user = req.user;
		
		if (user) {
			
			var userRole = user.role;
			logger.info(`User ${user.name} (${userRole.access_level}) has requested access to '${req.originalUrl}' (${accessLevel})`);
			
			//If user has the correct access level, then set isAuthenticated to true
			if( userRole.access_level >= accessLevel ){
				
				isAuthenticated = true;
			}
			// If user does not have the correct access level, then handle redirection and return false
			else{
				
				if (req.method == 'GET' && user.name == "default_user") {
					res.redirect(`/user/login?redirectURL=${req.originalUrl}`);
				}
				else {
					res.redirect('/?alert=You are not authorized to access this page.&type=error');
				}
			}
		}
		// If user is undefined, then send them to the index page to select an organization
		else {
			
			res.redirect(`/?redirectURL=${req.originalUrl}`);
		}
		
		return isAuthenticated;
	}
	
	//write authenticate function to req
	Object.defineProperty(req, 'authenticate', {
		value: authenticate,
		writable: false
	});
	
	next();
}

//View engine locals variables
//IMPORTANT: Must be called LAST, because it may rely on other usefunctions data
functions.setViewVariables = async function(req, res, next){
	
	logger.debug("usefunctions.js - functions.userViewVars: ENTER");
	
	if(req.user) {
		const org = await utilities.findOne('orgs', 
			{org_key: req.user.org_key},
			{},
			{allowCache: true}
		);
		req.user.org = org;
		res.locals.user = req.user;
	} 
	
	var fileRoot;
	
	//If we have set a process tier and S3 bucket name, then set fileRoot to an S3 url
	if( process.env.TIER && process.env.S3_BUCKET && process.env.STATICFILES_USE_S3 == 'true' ){
		
		fileRoot = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${process.env.TIER}`;
	}
	//Otherwise set fileRoot as / for local filesystem
	else{
		
		fileRoot = '';
	}
	
	res.locals.fileRoot = fileRoot;
	
	//Set alert local in here so that we don't have to throw this into Every Single Route
	res.locals.alert = req.query.alert;
	res.locals.alertType = req.query.type;
	
	next();
}

/**
 * Gets event info from local db
 */
functions.getEventInfo = async function(req, res, next) {
	
	//Define req.event
	req.event = {
		key: "undefined",
		name: "undefined",
		year: "undefined",
		teams: null,
	};
	
	// replacing 'current' collection with "currentEvent" attribute in a specific org [tied to the user after choosing an org]
	var thisOrg;
	if (req && req.user && req.user.org_key) {
		var thisOrgKey = req.user.org_key;
		var thisOrg = await utilities.findOne("orgs", 
			{"org_key": thisOrgKey}, 
			{},
			{allowCache: true}
		);
	}

	//sets locals to no event defined just in case we don't find thing and we can just do next();
	var eventId = 'No event defined';
	var eventYear = 'No year defined';
	res.locals.eventName = eventId;
	
	//if exist
	if (thisOrg) {
		
		eventId = thisOrg.event_key;
		eventYear = parseInt(eventId);
		//set event key
		req.event.key = eventId;
		req.event.year = eventYear;
		res.locals.event_key = req.event.key;
		res.locals.event_year = req.event.year;
		
		var currentEvent = await utilities.findOne("events", 
			{key: eventId}, 
			{},
			{allowCache: true, maxCacheAge: 60},
		);
		
		if (currentEvent) {
			//Set current event info to req.event and res.locals
			res.locals.eventName = currentEvent.year + " " + currentEvent.name;
			req.event.name = currentEvent.name;
			
			//If a list of teams exists, find team info in teams db.
			if (currentEvent.team_keys && currentEvent.team_keys.length > 0) {
				
				var teams = await utilities.find("teams", 
					{"key": {$in: currentEvent.team_keys}}, 
					{sort: {team_number: 1}}, 
					{allowCache: true, maxCacheAge: 60}
				);
				//Set teams list to req.event.teams
				req.teams = teams;
				res.locals.teams = teams;
			}
		}
	}
	
	next();
}

/**
 * Logs requests and user agent
 */
functions.requestLogger = function(req, res, next){
	
	//formatted request time for logging
	let d = new Date(req.requestTime),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear(),
		hours = d.getHours(),
		minutes = d.getMinutes(),
		seconds = d.getSeconds();
	month = month.length<2? '0'+month : month;
	day = day.length<2? '0'+day : day;
	let formattedReqTime = (
		[year, month, day, [hours, minutes, seconds].join(':')].join('-')
	)
	
	//user agent
	req.shortagent = {
		ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
		device: req.useragent.isMobile ? "mobile" : req.useragent.isDesktop ? "desktop" : (req.useragent.isiPad || req.useragent.isAndroidTablet) ? "tablet" : req.useragent.isBot ? "bot" : "other",
		os: req.useragent.os,
		browser: req.useragent.browser
	}
	//logs request
	console.log( (req.method).red 
		+ " Request from " 
		+ req.shortagent.ip
		+ " on " 
		+ req.shortagent.device 
		+ "|"
		+ req.shortagent.os
		+ "|"
		+ req.shortagent.browser
		+ " to "
		+ (req.url).cyan
		+ " at "
		+ formattedReqTime);
	//fds
	
	res.locals.shortagent = req.shortagent;
	
	next();
}

/**
 * Extra logging for res.render and res.redirect
 */
functions.renderLogger = function(req, res, next){
	
	res.render = (function(link, param){
		var cached_function = res.render;
		
		return function(link, param){
			
			//stores pre-render post-request time
			let beforeRenderTime = Date.now() - req.requestTime;
			
			//applies render function
			let result = cached_function.apply(this, arguments);
			
			//stores post-render time
			let renderTime = Date.now() - req.requestTime - beforeRenderTime;
			
			let appender = "[cache=0]";
			if (utilities.options && utilities.options.cache.enable == true) {
				appender = "[cache=1]";
			}
			
			logger.info(`Completed route in ${(beforeRenderTime).toString().yellow} ms; Rendered in ${(renderTime).toString().yellow} ms ${appender} \t[Route: ${res.req.originalUrl.brightGreen} View: ${link.brightGreen}]`);
			
			return result;
		}
	}());
	
	res.redirect = (function(url, status){
		var cached_function = res.redirect;
		
		return function(url, status){
			
			//stores pre-render post-request time
			let completedRouteTime = Date.now() - req.requestTime;
			
			//applies render function
			let result = cached_function.apply(this, arguments);
			
			logger.info(`Completed ${res.req.url} in ${(completedRouteTime).toString().yellow} ms; Redirecting to ${(typeof url == 'string' ? url : " ").yellow + (typeof status == 'string' ? status : " ").yellow}`);
			
			return result;
		}
	}());
	
	next();
}
 
/**
 * Handles 404 errors
 */
functions.notFoundHandler = function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
};

/**
 * Handles all errors
 */
functions.errorHandler = function(err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};
	
	logger.error(err.message);
	
	// render the error page
	res.status(err.status || 500);
	res.render('error');
}