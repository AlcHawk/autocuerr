/**
 * Setting up the enum for positions.
 */
var positions = {
  top: 0,
  middle: 150,
  bottom: 300
}

/**
 * Creates a menu entry in the Google Docs UI when the document is opened.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 *
 * @param {object} e The event parameter for a simple onOpen trigger. To
 *     determine which authorization mode (ScriptApp.AuthMode) the trigger is
 *     running in, inspect e.authMode.
 */
function onOpen(e) {
  DocumentApp.getUi().createAddonMenu()
      .addItem('Start', 'showSidebar')
      .addToUi();
}

/**
 * Runs when the add-on is installed.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 *
 * @param {object} e The event parameter for a simple onInstall trigger. To
 *     determine which authorization mode (ScriptApp.AuthMode) the trigger is
 *     running in, inspect e.authMode. (In practice, onInstall triggers always
 *     run in AuthMode.FULL, but onOpen triggers may be AuthMode.LIMITED or
 *     AuthMode.NONE.)
 */
function onInstall(e) {
  onOpen(e);
}

/**
 * Opens a sidebar in the document containing the add-on's user interface.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 */
function showSidebar() {
  var ui = HtmlService.createHtmlOutputFromFile('Sidebar').setTitle('autocuerr');
  DocumentApp.getUi().showSidebar(ui);
}

/**
 * Converting hexidecimal color code to RGB color code
 * 
 * @param {object} hex The hex string of color code.
 * @return {Array.<float>} The RGB color code [R, G, B].
 */
function hexToRgb(hex) {
  var c;
  if (/^#([a-fA-F0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split("");
    if (c.length == 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    
    c = "0x" + c.join("");
    return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
  }
  throw new Error("Bad Hex");
}

/**
 * Sets the position into the PropertiesService.
 *
 * @param {string} position The position to be set.
 */
function setPosition(position) {
  var prop = PropertiesService.getUserProperties();
  prop.setProperty("position", position);
  
  return prop.getProperty("position");
}

/**
 * Gets the position into the PropertiesService.
 *
 * @param {string} key The key to extract the position value.
 */
function getPosition(key) {
  var prop = PropertiesService.getUserProperties();
  var position = prop.getProperty(key);
  
  return position;
}

/**
 * Create a new Slide.
 *
 * @param {object} title The title is required to name the new Slide.
 */
function createPresentation(title) {
  var presentation = Slides.Presentations.create({"title": title});
  Logger.log("Created presentation with ID: " + presentation.presentationId);
  
  var pageId = presentation.slides[0].objectId;
  var requests = [{
    "deleteObject": {
      "objectId": pageId
    }
  }];
  
  Slides.Presentations.batchUpdate({'requests': requests}, presentation.presentationId);
  
  return presentation.presentationId;
}

/**
 * Creates new slide.
 *
 */
function createSlide(
  presentationId,
  text,
  textColor,
  backgroundColor,
  fontSize,
  italic,
  bold
) {
  var pageId = Utilities.getUuid();
  var bgColorRgb = hexToRgb(backgroundColor);
  var textColorRgb = hexToRgb(textColor);
  
  var requests = [{
    "createSlide": {
      "objectId": pageId,
      "insertionIndex": 0,
      "slideLayoutReference": {
        "predefinedLayout": "BLANK"
      }
    }
  },{
    "updatePageProperties": {
      "objectId": pageId,
      "fields": "pageBackgroundFill",
      "pageProperties": {
        "pageBackgroundFill": {
          "solidFill": {
            "color": {
              "rgbColor": {
                "red":   bgColorRgb[0] / 255,
                "green": bgColorRgb[1] / 255,
                "blue":  bgColorRgb[2] / 255
              }
            }
          }
        }
      }
    }
  }];
  var slide = Slides.Presentations.batchUpdate({'requests': requests}, presentationId);
  Logger.log("Created Slide with ID: " + slide.replies[0].createSlide.objectId);
  
  addTextBox(presentationId, pageId, text, fontSize, textColorRgb, italic, bold);
}

/**
 * Adds new text box with additional settings, including font size,
 * text color, italic, and bold.
 *
 * @param {object} presentationId The ID for the designated slide.
 * @param {object} pageId The ID for the specific page in slide where
 *     the text box is inseted.
 * @param {object} text The text to be inserted into the text box.
 * @param {object} fontSize The font size of the text.
 * @param {Array.<float>} textColor The color assigned to the text, should
 *     be wrapped in an array of RGB color.
 * @param {boolean} italic The boolean value as to if the font should be italic.
 * @param {boolean} bold The boolean value as to if the font should be bold.
 */
function addTextBox(
  presentationId,
  pageId,
  text,
  fontSize,
  textColor,
  italic,
  bold
) {
  var pageElementId = Utilities.getUuid();
  var position;
  
  if (getPosition("position") == null) {
    position = "middle";
  } else {
    position = getPosition("position");
  }
  
  var requests = [{
    "createShape": {
      "objectId": pageElementId,
      "shapeType": "TEXT_BOX",
      "elementProperties": {
        "pageObjectId": pageId,
        "size": {
          "width": {
            "magnitude": 720,
            "unit": "PT"
          },
          "height": {
            "magnitude": 100,
            "unit": "PT"
          }
        },
        "transform": {
          "scaleX": 1,
          "scaleY": 1,
          "translateX": 0,
          "translateY": positions[position],
          "unit": "PT"
        }
      }
    }
  }, {
    "insertText": {
      "objectId": pageElementId,
      "text": text,
      "insertionIndex": 0
    }
  }, {
    "updateTextStyle": {
      "objectId": pageElementId,
      "fields": "foregroundColor,bold,italic,fontFamily,fontSize,underline",
      "style": {
        "foregroundColor": {
          "opaqueColor": {
            "rgbColor": {
              "red":   textColor[0] / 255.0,
              "green": textColor[1] / 255.0,
              "blue":  textColor[2] / 255.0,
            }
          }
        },
        "bold": bold,
        "italic": italic,
        "underline": false,
        "fontFamily": "Consolas",
        "fontSize": {
          "magnitude": fontSize,
          "unit": "PT"
        }
      },
      "textRange": {
        "type": "ALL"
      }
    }
  }, {
    "updateParagraphStyle": {
      "objectId": pageElementId,
      "fields": "alignment",
      "style": {
        "alignment": "CENTER"
      }
    }
  }];
  var response = Slides.Presentations.batchUpdate({'requests': requests}, presentationId);
  Logger.log("Created Textbox with ID: " + response.replies[0].createShape.objectId);
}

function getEmailBody(fileId) {
  var head = HtmlService.createHtmlOutputFromFile("Email_head").getContent();
  var tail = HtmlService.createHtmlOutputFromFile("Email_tail").getContent();
  var fileLink = "<a href='https://docs.google.com/presentation/d/"+fileId+"' target='_blank'>Open in Google Slides</a>";
  var email = head + fileLink + tail;
  
  return email;
}

function sendEmail(fileId) {
  var email = Session.getActiveUser().getEmail();
  var emailBody = getEmailBody(fileId);
  var userName = DriveApp.getFileById(fileId).getOwner().getName();
  
  MailApp.sendEmail({
    to: email,
    subject: "Hi "+userName+", here's your new slide created by autocuerr",
    htmlBody: emailBody
  });
}

function shareFileById(fileId, emails) {
  var file = DriveApp.getFileById(fileId);
  file.addEditors(emails);
}

function getContactsEmails() {
  var contacts = ContactsApp.getContacts();
  var emails = [];
  
  for (var i in contacts) {
    var contactEmails = contacts[i].getEmails();
    for (var j in contactEmails) {
      emails.push(contactEmails[j].getAddress());
    }
  }
  
  return emails;
}

function getContactsEmailByName(name) {
  var contacts = ContactsApp.getContactsByName(name);
  var emails = [];
  
  for (var i in contacts) {
    var contactEmails = contacts[i].getEmails();
    for (var j in contactEmails) {
      emails.push(contactEmails[j].getAddress());
    }
  }
  return emails;
}

function getContactEmailByEmail(email) {
  var contacts = ContactsApp.getContactsByEmailAddress(email);
  var emails = [];
  
  for (var i in contacts) {
    var contactEmails = contacts[i].getEmails();
    for (var j in contactEmails) {
      emails.push(contactEmails[j].getAddress());
    }
  }
  return emails;
}

/**
 * The main function that evokes the slide creation
 *
 * @param {string} textColor The color hex string that is assigned to the text.
 * @param {string} backgroundColor The color hex string that is assigned to the background.
 * @param {int} fontSize The int value indicates the font size.
 * @param {boolean} italic The boolean value that sets the text to be italic.
 * @param {boolean} bold The boolean value that sets the text to be bold.
 * @param {boolean} sendMe The boolean value that sets if user would like to receive a copy.
 * @param {Array.<string>} emails The array that stores the emails for sharing the slide.
 */
function main(
  textColor, 
  backgroundColor, 
  fontSize, 
  italic, 
  bold,
  sendMe,
  emails
) {
  var doc = DocumentApp.getActiveDocument();
  var title = doc.getName();
  var text = doc.getBody().getText();
  var len = text.length;
  var lines = [];
  var line = "";
  
  if (text.length == 0) {
    throw new Error("I cannot work without giving me any lyrics, please enter the lyrics so that I can sing.");
  }
  
  for (var i = 0; i < len; i++) {
    if (text[i] != '\n') {
      line = line.concat(text.charAt(i));
    } else {
      if (line.length) {
        lines.push(line);
        line = "";
      }
    }
  }
  // Adding the last line into the array
  if (line.length > 0) {
    lines.push(line);
  }
  
  var presentationId = createPresentation(title);
  for (var i=lines.length-1; i>=0; i--) {
    createSlide(
      presentationId,
      lines[i],
      textColor,
      backgroundColor,
      fontSize,
      italic,
      bold
    );
  }
  
  if (sendMe) {
    sendEmail(presentationId);
  }
  
  if (emails.length) {
    shareFileById(presentationId, emails);
  }
  
  // Returning the presentation ID to generate the link for opening the slide.
  return presentationId;
}

/**
 * Test functions.
 */

function testGetContacts() {
  Logger.log(getContactsEmails());
}
  
function testGetPosition() {
  var r = getPosition("position");
  Logger.log(r);
}

function testGetPositionEnum() {
  Logger.log(positions["middle"]);
}