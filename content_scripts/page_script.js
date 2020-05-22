/**
 * firelux2
 * Copyright (C) 2020  ValentinG
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * @license GPLv3
 * @author  ValentinG
 * @version 2.0.0.5
 * @link    https://framagit.org/ValentinG/firelux2
 */

var firelux = (function() {

    //Predefined color
    var orange_colorCode = "FF9329";

    var changeAutoIntervalId = null;

    var beatStarted = false;
    var lastAlive = null;

    //Local data
    var temperature = {
        enabled: false,
        enabledByTimer: false,
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

        if (temperature.enabled || temperature.enabledByTimer) {
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
            div.style.mixBlendMode = "multiply";

            div.style["background-color"] = ("#" + temperature.color);
            div.style.opacity = temperature.alpha;

            // Todo: if temperature.enabledByTimer animation
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

            temperature.enabledByTimer = timerstart < currentDate && timerend > currentDate;

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
     * Start beat in order to cancel the preview of the modifications if the panel is closed.
     */
    var startBeat = function() {
        if (beatStarted)
            return;

        beatStarted = true;
        var beat = function() {
            setTimeout(function() {
                var limit = new Date();
                limit.setMilliseconds((limit.getMilliseconds() - 500));
                if (lastAlive <= limit) {
                    restoreLocalStorage();
                    beatStarted = false;
                } else
                    beat();
            }, 500);
        };

        beat();
    };

    /**
     * Initialization.
     */
    var init = function() {
        browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
            if (request.isAlive) {
                lastAlive = new Date();
                if (!beatStarted)
                    startBeat();
                return;
            }

            initStorage(request.temperature);
        });

        restoreLocalStorage();
    };

    /**
     * Restore configuration.
     * @param {object} storage - 'temperature' object to storage.
     */
    var initStorage = function(storage) {
        initialized = true;

        if (storage != null && !isEmptyObject(storage)) {
            temperature = storage;
        }

        start();
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
     * Restore configuration from local storage.
     */
    var restoreLocalStorage = function() {
        browser.storage.local.get().then(function(storage) {
            if (storage != null && storage.temperature != null) {
                initStorage(storage.temperature);
            } else {
                initStorage(null);
            }
        }, function() {
            initStorage(null);
        });
    };




    return {
        init: init
    };
})();

firelux.init();