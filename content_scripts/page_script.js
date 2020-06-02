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
 * @version 2.0.1.0
 * @link    https://framagit.org/ValentinG/firelux2
 */

var firelux = (function() {

    var changeAutoIntervalId = null;

    var beatStarted = false;
    var lastAlive = null;

    //Local data
    var temperature = null;
    var ignoreList = [];


    /**
     * Check change auto required and apply color.
     */
    var apply = function() {
        if (!mustBeIgnored()) {
            if (!temperature.timerEnabled && changeAutoIntervalId != null) {
                clearInterval(changeAutoIntervalId);
                changeAutoIntervalId = null;
            }

            if (temperature.timerEnabled)
                checkTemparatureEnabledByTimer();
            else
                temperature.enabled = true;
        } else
            temperature.enabled = false;

        applyColor();
    };

    /**
     * Apply configuration.
     */
    var applyColor = function() {
        if (document.getElementById("fireluxOverlay") != null)
            document.getElementById("fireluxOverlay").remove();

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
            div.style.opacity = 1;

            var color = fireluxUtils.color.hexToRgb(("#" + temperature.color));
            div.style["background-color"] = "rgba(" + color.r + ", " + color.g + ", " + color.b + ", " + temperature.alpha + ")";

            // Todo: if temperature.enabledByTimer animation
            // div.style.transition = "all 2s linear";

            document.documentElement.appendChild(div);
        }
    };

    /**
     * Check if filter should be enabled by timer.
     */
    var checkTemparatureEnabledByTimer = function() {
        var currentDate = new Date();
        var timerstart = new Date();
        var timerend = new Date();

        timerstart.setHours(temperature.starthour);
        timerstart.setMinutes(temperature.startminute);
        timerstart.setSeconds(0, 0);
        timerend.setHours(temperature.endhour);
        timerend.setMinutes(temperature.endminute);
        timerend.setSeconds(0, 0);

        if (timerstart > timerend)
            timerend.setDate(timerend.getDate() + 1);

        temperature.enabledByTimer = timerstart < currentDate && timerend > currentDate;

        if (changeAutoIntervalId == null) {
            changeAutoIntervalId = setInterval(function() {
                apply();
            }, (60 * 1000));
        }
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

            if (request.refreshData) {
                restoreStorage();
                return;
            }

            temperature = request.temperature;
            apply();
        });

        restoreStorage();
    };

    /**
     * Check if current tab should be ignored.
     * @returns {boolean} - Current tab must be ignored.
     */
    var mustBeIgnored = function() {
        var host = fireluxUtils.cleanUrl(new URL(window.location.href));
        var result = host == null || ignoreList.includes(host);
        return result;
    };

    /**
     * Restore configuration from local storage.
     */
    var restoreStorage = function() {
        fireluxUtils.getBestStorage().then(function(storage) {
            ignoreList = storage.ignoreList;
            temperature = storage.temperature;
            apply();
        });
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
                    restoreStorage();
                    beatStarted = false;
                } else
                    beat();
            }, 250);
        };

        beat();
    };


    return {
        /**
         * Initialization.
         */
        init: init
    };
})();

firelux.init();