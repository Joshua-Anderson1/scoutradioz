"use strict";
// Notification cards.
//	Usage:
// 		NotificationCard.show("My text");
//		NotificationCard.show("This is an error!", {type: 'error'});
//		NotificationCard.warn("Watch out!");
//		NotificationCard.show("Click out of me!", {ttl: 0, exitable: true});
//		
//		var myCard = new NotificationCard("My text", {ttl: 0});
//		myCard.show();
//		myCard.remove();
//	Use the static methods 'show', 'good', 'warn', and 'bad' to quickly display a card with your message.
//	The aforementioned static methods will create a new card, which will automatically fade out a few seconds later.
//	To have greater control over your notification card, create one using the constructor: new NotificationCard(text, options)
//	Supported options:
//		type (String):
//			'good' or 'success': Card will be blue or green, meant to signify a success message.
//			'warn': Card will be amber, meant to signifiy a warning.
//			'bad' or 'error': Card will be red, meant to signify an error.
//			default: Card will be white or gray, meant to signify a standard message.
//		ttl (number): Time for card to live before it is faded and removed, in milliseconds. Default: 2000ms.
//		exitable (boolean): If true, the card will contain an X button, allowing the user to close the notification card. Default: false.
//		darken (boolean): If true, a semitransparent filter will appear over the document, blocking user input, 
//			until the card is removed. Default: false.
class NotificationCard{
	
	/**
	 * @param {String} text Text to display on notification card
	 * @param {Object} options Options
	 */
	constructor(text, options){
		
		if (!options) options = {};
		
		this.text = text;
		
		if (typeof text != "string") {
			throw new TypeError("NotificationCard: text must be string.");
		}
		if (typeof options != "object"){
			throw new TypeError("NotificationCard: opts must be object.");
		}
		
		this.opts = this._filterOptions(options)
	}
	
	/**
	 * Static method to create and return a new NotificationCard with specified options.
	 * @param {String} text Text to display on notification card
	 * @param {Object} opts (optional) Options
	 * @return {NotificationCard} The new NotificationCard object.
	 */
	static show(text, opts){
		
		var newCard = new NotificationCard(text, opts);
		
		newCard.show();
		
		return newCard;
	}
	
	/**
	 * Shorthand to display an error/bad notification card.
	 * @param {string} text Text to display.
	 * @param {Object} opts (optional) Options
	 */
	static error(text, opts){
		
		if (!opts) opts = {};
		opts.type = 'error';
		
		return NotificationCard.show(text, opts);
	}
	
	/**
	 * Shorthand to display a good/success notification card.
	 * @param {string} text Text to display.
	 */
	static good(text, opts){
		
		if (!opts) opts = {};
		opts.type = 'good';
		
		return NotificationCard.show(text, opts);
	}
	
	/**
	 * Shorthand to display a warning notification card.
	 * @param {string} text Text to display.
	 */
	static warn(text, opts){
		
		if (!opts) opts = {};
		opts.type = 'warn';
		
		return NotificationCard.show(text, opts);
	}
	
	/**
	 * Gets and creates static container element for all notification cards.
	 * @return {JQuery} Parent element that contains all notification cards.
	 */
	static container(){
		
		var containerElement = $("#notificationcard-container");
		
		if ( !containerElement[0] ){
			containerElement =  $(document.createElement("div"))
			.addClass("notification-card-container")
			.attr("id", "notificationcard-container")
			.appendTo(document.body);
		}
		return containerElement;
	}
	
	/**
	 * Display the card.
	 */
	show(){
		
		var card = $(document.createElement("div"))
			.addClass("notification-card")
			.css({
				"background-color": this.opts.color,
				"border-bottom-color": this.opts.borderColor,
				"color": this.opts.textColor,
			});
		var text = $(document.createElement("div"))
			.addClass("notification-card-content")
			.text(this.text);
		
		if (this.opts.exitable) {
			
			var exitBtn = $(document.createElement("div"))
				.addClass("notification-card-exit")
				.css({})
				.text('X')
				.click(() => {
					//Onclick handler for exit button.
					this.remove();
					//remove screen darkener if applicable
					if (this.opts.darken && this.darkener) {
						$(this.darkener).remove();
					}
				});
			card.append(exitBtn);
		}
			
		card.append(text);
		//text.append(exitBtn);
		
		NotificationCard.container().append(card);
		
		if (this.opts.darken){
			this.darkener = $(document.createElement("div"))
			.addClass("canvas")
			.addClass("theme-darkener")
			.appendTo(NotificationCard.container());
		}
		
		this.card = card;		
		
		if (this.opts.ttl != 0){
			setTimeout(() => {
				this.remove(1900);
			}, this.opts.ttl);
		}
		
		return this;
	}
	
	/**
	 * Remove the card from the document.
	 * @param {Number} time (Optional) Fade-out card with given time interval. (Default: 0ms, no fade)
	 */
	remove(time){
		
		var removeTime = 0;
		
		if (typeof time == "number") {
			removeTime = time;
		}
		
		if (this.card) {
			$(this.card).css("opacity", 0);
			setTimeout(() => {
				$(this.card).remove();
			}, removeTime);
		}
		
		return this;
	}
	
	_filterOptions(options){
		
		var defaultOpts = {
			type: "normal",
			ttl: 2000,
			exitable: false,
			darken: false,
		}
		
		var opts = defaultOpts;
		
		for (var option in opts) {
			
			if (options.hasOwnProperty(option)) {	
				switch(option){
					case "type":
						if (typeof options[option] == 'string') opts[option] = options[option];
						else throw new TypeError("NotificationCard.opts.type must be string.")
						break;
					case "ttl":
						if (typeof options[option] == 'number') opts[option] = options[option];
						else throw new TypeError("NotificationCard.opts.ttl must be a number.")
						break;
					case "exitable":
						if (typeof options[option] == 'boolean') opts[option] = options[option];
						else throw new TypeError("NotificationCard.opts.exitable must be a boolean.")
						break;
					case "darken":
						if (typeof options[option] == 'boolean') opts[option] = options[option];
						else throw new TypeError("NotificationCard.opts.darken must be a boolean.");
						break;
					default:
						throw new ReferenceError("NotificationCard.opts: Unknown option " + option);
				}
			}
		}
		
		//sort through type and set opts.color and opts.textColor
		switch (opts.type) {
			case "good": 
			case "success": 
				opts.color = "rgb(91, 209, 255)";
				opts.borderColor = "rgb(59, 102, 119)";
				opts.textColor = "rgb(0,0,0)";
				break;
			case "warn": 
				opts.color = "rgb(230,170,10)";
				opts.borderColor = "rgb(90,54,0)";
				opts.textColor = "rgb(0,0,0)";
				break;
			case "bad": 
			case "error": 
				opts.color = "rgb(160,20,10)";
				opts.borderColor = "rgb(84,0,0)";
				opts.textColor = "rgb(255,255,255)";
				break;
			default: 
				opts.color = "rgb(240,245,255)";
				opts.borderColor = "rgb(80,80,84)";
				opts.textColor = "rgb(0,0,0)";
		}
		
		return opts;
	}
}