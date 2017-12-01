var firelux = (function() {

    //Predefined color
    var orange_colorCode = "FF9329";

    var changeAutoIntervalId = null;

    //Local data
    var temperature = {
        enabled: false,
        color: orange_colorCode,
        alpha: 0.3,
        starthour: "01",
        startminute: "00",
        endhour: "01",
        endminute: "00",
        timerenabled: false,
        iscustom: false
    };


    /**
     * Apply configuration.
     */
    var applycolor = function() {
        if (document.getElementById("fireluxOverlay") != null) {
            document.getElementById("fireluxOverlay").remove();
        }

        if (temperature.enabled) {
            var div = document.createElement('div');
            div.id = "fireluxOverlay";
            div.style.zIndex = 2147483647;
            div.style.display = "block";
            div.style.width = "100%";
            div.style.height = "100%";
            div.style.pointerEvents = "none";
            div.style.position = "fixed";
            div.style.top = 0;
            div.style.left = 0;

            div.style["background-color"] = ("#" + temperature.color);
            div.style.opacity = temperature.alpha;

            document.documentElement.appendChild(div);
        }
    };

    /**
     * Change auto check and enable. 
     */
    var start = function() {
        if (!temperature.timerenabled && changeAutoIntervalId != null) {
            clearInterval(changeAutoIntervalId);
            changeAutoIntervalId = null;
        }

        if (temperature.timerenabled) {
            var currentDate = new Date();
            var timerstart = new Date();
            var timerend = new Date();

            timerstart.setHours(temperature.starthour);
            timerstart.setMinutes(temperature.startminute);
            timerstart.setSeconds(0, 0);
            timerend.setHours(temperature.endhour);
            timerend.setMinutes(temperature.endminute);
            timerend.setSeconds(0, 0);

            if (timerstart > timerend) {
                timerend.setDate(timerend.getDate() + 1);
            }

            temperature.enabled = timerstart < currentDate && timerend > currentDate;

            if (changeAutoIntervalId == null) {
                changeAutoIntervalId = setInterval(function() {
                    start();
                }, (60 * 1000));
            }
        } else {
            temperature.enabled = true;
        }

        applycolor();
    };

    /**
     * Initialization.
     */
    var init = function() {
        browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
            restoreStorage(request.temperature);
        });

        browser.storage.local.get().then(function(storage) {
            if (storage != null && storage.temperature != null) {
                restoreStorage(storage.temperature);
            } else {
                restoreStorage(null);
            }
        }, function() {
            restoreStorage(null);
        });
    };

    /**
     * Check if object is empty.
     * @param {object} obj - Object to test.
     */
    var isEmptyObject = function(obj) {
        var name;
        for (name in obj) {
            return false;
        }
        return true;
    };

    /**
     * Restore configuration.
     * @param {object} storage - 'temperature' object to storage.
     */
    var restoreStorage = function(storage) {
        initialized = true;

        if (storage != null && !isEmptyObject(storage)) {
            temperature = storage;
        }

        start();
    };


    return {
        init: init
    };
})();

firelux.init();