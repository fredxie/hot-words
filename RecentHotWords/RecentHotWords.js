// Copyright (c) 2012 Tianxu Wang. All rights reserved.

var storage = chrome.storage.sync;

// Default TrashList used to filter out unwanted words.
var defaultTrash = ['you', 'your', 'yours', 'mine', 'his',
                'him', 'her', 'she', 'they', 'the', 'not',
                'has', 'had', 'have', 'them', 'their',
                'com', 'org', 'edu', 'www', 'net', 'page',
                'for', 'and', 'when', 'how', 'what', 'where',
                'did', 'done', 'with', 'web', 'new', 'get'];

var resetButton = document.querySelector('button.reset');
resetButton.addEventListener('click', resetWordList);

// Event listener for clicks on links in a browser action popup.
// Open the link in a new tab of the current window.
function onAnchorClick(event) {
  chrome.tabs.create({
    selected: true,
    url: event.srcElement.href
  });
  return false;
}

// reset the trash list and refresh the popup
function resetWordList() {
    localStorage['trashList'] = JSON.stringify(defaultTrash);
    buildWordList('words_div');
}

// Given an array of object{key: k, value: v}, build a DOM list of those keywords in the
// browser action popup.
function buildPopupDom(divName, list, deletedWord) {
    storage.get('numOfWordsSetting', function (items) {
        var favNumOfWords = items.numOfWordsSetting;
        if (favNumOfWords == 'five') {
            var numOfWords = 5;
        }
        else if (favNumOfWords == 'ten') {
            var numOfWords = 10;
        }
        else if (favNumOfWords == 'twenty') {
            var numOfWords = 20;
        }
        
        if (localStorage['trashList']) {
            var trash = JSON.parse(localStorage['trashList']);
        }
        else {
            var trash = defaultTrash;
        }     
        trash.push(deletedWord);
        localStorage['trashList'] = JSON.stringify(trash);
            
        if (deletedWord != '') {
            for (var i = 0; i < list.length; i++) {
                if (list[i] == deletedWord) {
                    list.splice(i, 1);                 
                }
            }
        }

        var result = list.slice(0, numOfWords);

        var popupDiv = document.getElementById(divName);
        popupDiv.innerHTML = '';
        var ul = document.createElement('ul');
        popupDiv.appendChild(ul);

        for (var i = 0; i < result.length; i++) {
            var a = document.createElement('a');
            a.appendChild(document.createTextNode(result[i]));
            var newHref = 'https://www.google.com/search?q=' + result[i];
            a.href = newHref;           
            a.addEventListener('click', onAnchorClick);

            var li = document.createElement('li');
            li.id = result[i];
            ul.appendChild(li);
            li.appendChild(a);

            var span = document.createElement('span');
            span.addEventListener('click', function () {
                buildPopupDom(divName, list, this.parentElement.id);
            }, false); 
            li.appendChild(span);        
        }
    })
}

// see if a array contains one object.
function contains(a, obj) {
    for (var i = 0; i < a.length; i++) {
        if (a[i] === obj) {
            return true;
        }
    }
    return false;
}

// Mapper should return an array of [{key: 'somekey', value: 'somevalue'}]
// Reducer should return a single {key: 'somekey', value: 'somevalue'}
function mapReduce(i, mapper, reducer) {
    var intermediate = [];
    var output = [];
    for (var key in i) {
        var value = i[key];
        //console.log(value);
        intermediate = intermediate.concat(mapper(key, value));
    }
    //console.log(intermediate);
    var groups = groupBy(intermediate);
    for (var key in groups) {
        var values = groups[key];
        output.push(reducer(key, values));
    }
    return output;
}

// List should be [{key: k, value: v}, ...] where key may be repeated.
// returns [{key: k, [v1, v2, v3, ...]}, ...] where key is *not* repeated.
function groupBy(list) {
    var ret = {};
    for (var i = 0; i < list.length; i++) {
        var key = list[i].key;
        var value = list[i].value;
        if (!ret.hasOwnProperty(key)) {
            ret[key] = [];
        }
        ret[key].push(value);
    }
    return ret;
}

// Mapper should return an array of [{key: 'somekey', value: 'somevalue'}]
function myMapper(key, value) {
    var ret = [];
    if (localStorage['trashList']) {
        var trash = JSON.parse(localStorage['trashList']);
    }
    else {
        var trash = defaultTrash;
    }
    var words = normalizeText(value).split(' ');
    for (var i = 0; i < words.length; i++) {
        if (words[i].length < 3 || contains(trash, words[i])) {
            continue;
        }
        ret.push({ key: words[i], value: 1 });
    }
    return ret;  
}

// Reducer should return a single {key: 'somekey', value: 'somevalue'}
function myReducer(intermediateKey, values) {
    var sum = 0;
    for (var i = 0; i < values.length; i++) {
        sum += values[i];
    }
    return { key: intermediateKey, value: sum };
}

// Normalize a string.
function normalizeText(s) {
    s = s.toLowerCase();
    s = s.replace(/[^a-z]+/g, ' ');
    return s;
}

// Compare function used to sort the output of MapReduce task.
function compare(propertyName) {
    return function (obj1, obj2) {
        var v1 = obj1[propertyName];
        var v2 = obj2[propertyName];
        if (v2 < v1) {
            return -1;
        }
        else if (v2 > v1) {
            return 1;
        }
        else {
            return 0;
        }
    }
}

// Search history to find top ten keywords that a user interested recentely,
// and show those keywords in a popup.
function buildWordList(divName) {
    // To look for history items visited in the last week(by default)/last day/last month,
    // subtract some microseconds from the current time.
    storage.get('timeSetting', function(items) {
        var favTime = items.timeSetting;
        if (favTime == 'oneDay') {
            var numOfDays = 1;
        }
        else if (favTime == 'oneWeek' || favTime == undefined) {
            var numOfDays = 7;
        }
        else if (favTime == 'oneMonth') {
            var numOfDays = 30;
        }
    
        var microsecondsOfDays = 1000 * 60 * 60 * 24 * numOfDays;
        var someDaysAgo = (new Date).getTime() - microsecondsOfDays;
        chrome.history.search({
            'text': '',                // Return every history item....
            'startTime': someDaysAgo,  // that was accessed some days ago.
            'maxResults': 4000         // Usually 4000 is enough for one-month history records.
        },

        function (historyItems) {
            // For each history item, output the visited titles to an array,
            // use MapReduce function to count the frequency of the keywords,
            // and list them in a popup according to the user configeration.
            var data = [];
            for (var i = 0; i < historyItems.length; i++) {
                data.push(historyItems[i].title);
            }
            var out = mapReduce(data, myMapper, myReducer);

            for (var i = 0; i < out.length; i ++) {
               console.log(out[i].key + '  ' + out[i].value);
            }

            var intermediate = out.sort(compare('value'));
            var keyList = [];
            for (var i = 0; i < intermediate.length; i++) {
                keyList.push(intermediate[i].key);
            }
           
            // Given an array of object{key: k, value: v}, build a DOM list of those keywords in the
            // browser action popup.
            buildPopupDom('words_div', keyList, '');          
        });
    })
}

document.addEventListener('DOMContentLoaded', function () {
    buildWordList('words_div');
});