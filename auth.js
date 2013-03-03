var authUrl = 'https://accounts.google.com/o/oauth2/auth';
var tokenUrl = 'https://accounts.google.com/o/oauth2/token';
var tokenValidationUrl = 'https://www.googleapis.com/oauth2/v1/tokeninfo';

var clientId = 'YOUR_CLIENT_ID';
var clientSecret = 'YOUR_CLIENT_SECRET';
var redirectUri = 'urn:ietf:wg:oauth:2.0:oob';
var authScope = 'https://www.googleapis.com/auth/plus.login';
var visibleActions = 'http://schemas.google.com/AddActivity' + 
    ' http://schemas.google.com/ReviewActivity';

// Loads consent dialog in pop up
function authorize() {
  var authParams = {
    'scope': authScope,
    'redirect_uri': redirectUri,
    'response_type': 'code',
    'client_id': clientId,
    'request_visible_actions': visibleActions
  }
  var windowConf = {
      url: authUrl + '?' + stringify(authParams),
      width: 500,
      height: 400,
      top: 200,
      left: 200,
      type: 'popup'
  };
  var authWindowId;
  var authTabId;
  chrome.windows.create(windowConf, function(window) {
    authWindowId = window.id;
  });

  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if(tab.title.indexOf('Success code=') != -1) {
      chrome.windows.remove(authWindowId);
      getTokens(tab.title);
    }
  });
}

// Extracts auth code from the tab title and sends request for tokens.
function getTokens(title) {
  var code = title.split('=').pop();
  var xhr = new XMLHttpRequest();
  xhr.open("POST", tokenUrl, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      var resp = JSON.parse(xhr.responseText);
      sendValidationRequest(resp);
    }
  };
  var tokenParams = {
    'grant_type': 'authorization_code',
    'client_id': clientId,
    'client_secret': clientSecret,
    'code': code,
    'redirect_uri': redirectUri,
    'scope': authScope
  };
  // Send the proper header information along with the request
  xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  xhr.send(stringify(tokenParams));
}

// Sends validation request for received tokens
function sendValidationRequest(accessToken) {
  var req = tokenValidationUrl;
  var validationParams = {
    'access_token': accessToken.access_token
  };
  var xhr = new XMLHttpRequest();
  xhr.open("GET", req + '?' + stringify(validationParams), true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      var resp = JSON.parse(xhr.responseText);
      processValidationResponse(resp, accessToken);
    }
  };
  xhr.send();
}

// Checks that the tokens have not been tampered with and are intender for 
// our app
function processValidationResponse(response, accessToken) {
  if (response.error == 'Invalid token' || response.audience != clientId) {
    authorize();
  } else {
    sendRequest(accessToken);
  }
}

// Sends a request, for example get profile
function sendRequest(token) {
  var req = 'https://www.googleapis.com/plus/v1/people/me';
  var requestParams = {
    'access_token': token.access_token
  };
  var xhr = new XMLHttpRequest();
  xhr.open("GET", req + '?' + stringify(requestParams), true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      var resp = JSON.parse(xhr.responseText);
      document.getElementById('result')
          .innerHTML = JSON.stringify(resp, null, 2);
    }
  };
  xhr.send();
}

// Utility function used to build requests
function stringify(parameters) {
  var params = [];
  for(var p in parameters) {
    params.push(encodeURIComponent(p) + '=' +
                encodeURIComponent(parameters[p]));
  }
  return params.join('&');
};

window.onLoad = authorize();
