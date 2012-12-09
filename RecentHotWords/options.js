var storage = chrome.storage.sync;

var defaultTime = 'oneWeek';
var defaultNumOfWords = 'ten';

var saveButton = document.querySelector('button.save');

loadOptions();

saveButton.addEventListener('click', saveOptions);

// Load the options
function loadOptions() {
    storage.get('timeSetting', function (items) {
        var favTime = items.timeSetting;
        if (favTime == undefined) {
            favTime = defaultTime;
        }
        var select = document.getElementById('time');
        for (var i = 0; i < select.children.length; i++) {
            var child = select.children[i];
            if (child.value == favTime) {
                child.selected = 'true';
                break
            }
        }
    });
    storage.get('numOfWordsSetting', function (items) {
        var favNumOfWords = items.numOfWordsSetting;
        if (favNumOfWords == undefined) {
            favNumOfWords = defaultNumOfWords;
        }
        var select = document.getElementById('numOfWords');
        for (var i = 0; i < select.children.length; i++) {
            var child = select.children[i];
            if (child.value == favNumOfWords) {
                child.selected = 'true';
                break;
            }
        }
    });
}

// Save the options
function saveOptions() {
    var selectTime = document.getElementById('time');
    var selectWord = document.getElementById('numOfWords')
    var favTime = selectTime.children[selectTime.selectedIndex].value;
    var favNumOfWords = selectWord.children[selectWord.selectedIndex].value;
    
    storage.set({'timeSetting': favTime}, function() {
        // Update status to let user know options were saved
        var status = document.getElementById('status');
        status.innerHTML = 'Options Saved.';
        setTimeout(function () {
            status.innerHTML = '';
        }, 3000);
    });
    storage.set({ 'numOfWordsSetting': favNumOfWords }, function () {
        var status = document.getElementById('status');
        status.innerHTML = 'Options Saved.';
        setTimeout(function () {
            status.innerHTML = '';
        }, 3000);
    });
}

