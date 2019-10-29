$(function(){
	
	/*
	if (localStorage.getItem("preprocessImages") == "true"){
		$("input[name=chkPreprocess]").prop("checked", true);
	}
	
	$("input[name=chkPreprocess]").on("change", function(){
		if (this.checked == true) {
			localStorage.setItem("preprocessImages", true);
		}
		else{
			localStorage.setItem("preprocessImages", false);
		}
	});*/
	
	//when a file input changes, run submit-image func.
	$("input[type=file]").on("change", submitImage);
	
	$("#submit").on('click', function(){
		
		var pitForm = $("form[name=scoutform]");
		
		console.log(pitForm);
		
		var pitSubmission = new FormSubmission(pitForm, "/scouting/pit/submit", "pitScouting");
		
		console.log(pitSubmission);
		
		pitSubmission.submit((err, message) => {
			if (err) {
				NotificationCard.error("An error occurred. Please retry.")
			}
			else{
				
				NotificationCard.show(message, {darken: true, type: "good", ttl: 0});
				
				setTimeout(() => {
					window.location.href = '/dashboard';
				}, 1000);
			}
		});
	});
	
	window.onbeforeunload = function() {
		return "Leaving this page will lose pit scouting data.";
	};
});

async function submitImage(ev){
	
	//var form = $("#imageform")[0];
	var imageInput = this;
	var imageInputID = imageInput.id
	//get the label so we can disable it during upload
	var button = $(`label[for=${imageInputID}]`);
	
	//formulate the url that we send a request to
	var key = $(imageInput).attr("key");
	var year = $("input[name=year]").val();
	var uploadURLBase = $("input[name=uploadURL]").val();
	
	var uploadURL = `${uploadURLBase}?key=${key}&year=${year}`;
	
	//create FormData object to submit
	var data = new FormData();
	
	var imageData = imageInput.files[0];
	
	if (imageData) {
		
		var imageFile = imageData;
		
		//debugToHTML(imageData);
		//debugToHTML(typeof imageData);
		
		//**Append the file to the FormData object under name "image"
		data.append("image", imageFile);
		
		console.log("Got data, going to submit to " + uploadURL);
		console.log(data.get("image"));
		
		//$("#logger").append(uploadURL + "\n");
		
		$(button).addClass("w3-disabled");
		
		var uploadingCard = new NotificationCard("Uploading photo...", {ttl: 0}).show();
		
		try{
			
			//Send an AJAX request
			$.ajax({
				type: "POST",
				enctype: 'multipart/form-data',
				url: uploadURL,
				data: data,
				processData: false, //Tutorial said that it's important to set processData to false
				contentType: false,
				cache: false,
				timeout: 60000,
				success: function (data) {
					
					console.log("SUCCESS : ", data);
					$(button).removeClass("w3-disabled");
					
					NotificationCard.good("Photo successfully uploaded.")
					
					//Refresh image href.
					if(typeof data == "array" || typeof data == "object"){
						switch(imageInputID){
							case "imageMain":
								//data[1] should be _md
								//?Date.now() will force browser to refresh cache
								$("#imgMain").attr("src", `${data[1]}?${Date.now()}`);
								break;
							case "imageA":
								//data[2] should be _sm
								$("#imgA").attr("src", `${data[2]}?${Date.now()}`);
								break;
							case "imageB":
								$("#imgB").attr("src", `${data[2]}?${Date.now()}`);
								break;
							case "imageC":
								$("#imgC").attr("src", `${data[2]}?${Date.now()}`);
								break;
						}
					}
				},
				error: function (err, textStatus, errorThrown) {
					
					console.error(err.responseText || err);
					$(button).removeClass("w3-disabled");
					
					//if error.responseText exists, then log that
					if (err.responseText){
						uploadingCard.remove(0);
						NotificationCard.show(err.responseText, {type: "bad", ttl: 10000});
						//debugToHTML(err.responseText+"\n");
					}
					//if error.responseText does not exist, then stringify error and log it
					else{
						uploadingCard.remove(0);
						NotificationCard.show(JSON.stringify(err), {type: "bad", ttl: 10000});
						//debugToHTML(JSON.stringify(err)+"\n");
					}
					//log textStatus and errorThrown
					//debugToHTML(textStatus+"\n");
					//debugToHTML(errorThrown+"\n");
					
				},/*
				xhr: function(){
					var xhr = $.ajaxSettings.xhr();
					var bar = new ProgressBar();
					
					console.log(xhr);
					
					//Upload progress
					xhr.onprogress = function(evt){
						console.log(evt);
						if (evt.lengthComputable) {
							var percentComplete = evt.loaded / evt.total;
							//console.log(percentComplete);
							//Update progress bar with percentComplete
							bar.update(percentComplete);
							
							if (percentComplete >= 1){
								bar.close();
							}
						}
					};
					console.log(xhr);
					
					return xhr;
				 },*/
			});	
		}
		catch (l) {
			uploadingCard.remove(0);
			NotificationCard.show(JSON.stringify(l), {type: "bad", ttl: 10000});
			//debugToHTML("CAUGHT: "+l+"\n");
		}
	}
}

/*
class ProgressBar{
	
	constructor(){
		
		this.container = document.createElement("div");
		$(this.container).css({
			"position": "fixed",
			"top": "0px",
			"left": "0px",
			"z-index": "3",
			"width": "100%",
			"height": "6px"
		});
		this.bar = document.createElement("div");
		$(this.bar).css({
			"width": "0%",
			"height": "100%",
			"background-color": "rgba(190,220,255,0.8)",
			"transition": ".5s"
		})
		.addClass("")
		.text(" ");
		$(this.container).append(this.bar);
		
		$(document.body).append(this.container);
	}
	
	update(decimalValue){
		
		if (decimalValue >= 0 && decimalValue <= 1){
			$(this.bar).css({
				"width": `${decimalValue * 100}%`
			});
		}
		else{
			throw new RangeError("Decimal value must be between 0 and 1.");
		}
	}
	
	close(){
		$(this.bar).css({
			"opacity": "0"
		});
		setTimeout(() => {
			$(this.container).remove();
		}, 1000);
	}
}*/

/*
function getImageData(input){
	
	return new Promise((resolve, reject) => {

		var file = input.files[0];
		
		console.log(file);
		Jimp = false;
		
		if (Jimp) {
			
			var preReadTime = Date.now();
			
			//Read file
			var reader = new FileReader();
			
			reader.onload = async () => {
				
				var imgArrayBuffer = reader.result;
				
				//Only process image if the user checked the checkbox.
				if (localStorage.getItem("preprocessImages") == "true") {
					
					NotificationCard.show("Compressing photo...");
					
					var preJimpReadTime = Date.now();
					
					//Read image buffer
					var image = await Jimp.read(imgArrayBuffer);
					
					var jimpReadTime = Date.now();
					
					var width = image.bitmap.width, height = image.bitmap.height;
					var ratio = width / height;
					var resizeWidth, resizeHeight;
					
					//only resize if original image is larger than 1000x1000
					if (width > 1000 && height > 1000) {
						if (width < height) {
							resizeWidth = 1000;
							resizeHeight = Math.floor( resizeWidth / ratio );
						}
						else {
							resizeHeight = 1000;
							resizeWidth = Math.floor( resizeHeight * ratio );
						}
						
						console.log("Resizing image")
						
						//resize image and transform to jpg
						//A higher resolution image can be a lower quality
						image.resize( resizeWidth, resizeHeight )
						.quality(60);
						
					}
					else {
						//a lower resolution image should be a higher quality
						image.quality(90);
					}
					
					var imgResizeTime = Date.now();
					
					image.getBuffer("image/jpeg", async (err, newArrayBuffer) => {
						if(err){
							console.error(err);
							debugToHTML(err);
							resolve(file);
						}
						
						var imgBufferTime = Date.now();
						
						var str = `FileRead: ${preJimpReadTime - preReadTime}ms, JimpRead: ${jimpReadTime - preJimpReadTime}ms, Resize: ${imgResizeTime-jimpReadTime}ms, getBuffer: ${imgBufferTime-imgResizeTime}ms`;
						console.log(str);
						debugToHTML(str);
						
						var newFile = new File(newArrayBuffer, file.name, {type: "image/jpeg"});
						
						resolve(newFile);
					});	
				}
				//If user does not want to preprocess the image, use the array buffer instead
				else {
					
					console.log(imgArrayBuffer);
					
					var newFile = new File(imgArrayBuffer, file.name, {type: "image/jpeg"});
					
					resolve(newFile);
				}
			};
			
			reader.readAsArrayBuffer(file);
		}
		//Fallback if Jimp is not defined
		else {
			resolve(file);
		}
	});
}*/