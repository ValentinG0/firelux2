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

    //Opacity config
    var opacityMax = 0.9;
    var opacityRangeMax = 100;

    //Stored data
    var storedTemperature = null;
    var storedUseSync = null;

    //Local data
    var localTemperature = null;
    var localUseSync = null;
    var ignoreList = [];
    var currentTabUrl = null;
    var currentTabIsIgnored = false;


    /**
     * Add all event.
     */
    var addEvent = function() {
        document.getElementById("disable-current").addEventListener("click", eventChangeDisableCurrentTab);

        document.getElementById("orange").addEventListener("click", function() {
            updateColor(fireluxUtils.orange_colorCode, false, false);
        });

        document.getElementById("black").addEventListener("click", function() {
            updateColor(fireluxUtils.black_colorCode, false, false);
        });

        document.getElementById("color").addEventListener("change", function() {
            if (this.value != null)
                updateColor(this.value, true, false);
        });

        document.getElementById("no-color").addEventListener("click", function() {
            setOpacity(0, false);
        });

        document.getElementById("opacity").addEventListener("change", eventOpacityChange);

        document.getElementById("opacity").addEventListener("input", eventOpacityChange);

        document.getElementById("change-auto").addEventListener("change", function() {
            if (this.checked != null)
                timerEnabled(this.checked);
        });

        document.getElementById("active-custom-color").addEventListener("change", function() {
            if (this.checked != null)
                customColor(this.checked);
        });

        document.getElementById("start-time-hour").addEventListener("change", function() {
            if (this.value != null)
                localTemperature.starthour = this.value;
        });

        document.getElementById("end-time-hour").addEventListener("change", function() {
            if (this.value != null)
                localTemperature.endhour = this.value;
        });

        document.getElementById("start-time-minute").addEventListener("change", function() {
            if (this.value != null)
                localTemperature.startminute = this.value;
        });

        document.getElementById("end-time-minute").addEventListener("change", function() {
            if (this.value != null)
                localTemperature.endminute = this.value;
        });

        document.getElementById("use-sync").addEventListener("change", function() {
            if (this.checked != null)
                setUseSync(this.checked);
        });

        document.getElementById("save").addEventListener("click", function() {
            saveTemperature();
        });
    };

    /**
     * Check if the current tab should be ignored and set disabled attribute on button.
     */
    var checkCurrentTabIsIgnored = function() {
        browser.tabs.query({ active: true, currentWindow: true }).then(function(tabs) {
            var url = new URL(tabs[0].url);
            currentTabUrl = fireluxUtils.cleanUrl(url);

            var className = "btn ";
            var disableCurrentTabElement = document.getElementById("disable-current");
            disableCurrentTabElement.disabled = false;

            if (ignoreList.includes(currentTabUrl)) {
                currentTabIsIgnored = true;
                var text = browser.i18n.getMessage("panel_disableCurrentTabEnabledLabel");
                disableCurrentTabElement.textContent = text;
                disableCurrentTabElement.className = (className += "btn-success");
            } else if (currentTabUrl == null || fireluxUtils.notSuppported.includes(currentTabUrl)) {
                currentTabIsIgnored = false;
                var text = browser.i18n.getMessage("panel_disableCurrentTabNotSupportedLabel");
                disableCurrentTabElement.textContent = text;
                disableCurrentTabElement.className = (className += "btn-default");
                disableCurrentTabElement.disabled = true;
            } else {
                currentTabIsIgnored = false;
                var text = browser.i18n.getMessage("panel_disableCurrentTabDisabledLabel");
                disableCurrentTabElement.textContent = text;
                disableCurrentTabElement.className = (className += "btn-warning");
            }
        });
    };

    /**
     * Convert percent to alpha.
     * @param {number} value - Percent value to convert.
     * @returns {number} - Alpha value.
     */
    var convertAlpha = function(value) {
        return value / opacityRangeMax * opacityMax;
    };

    /**
     * Convert alpha to percent.
     * @param {number} alpha - Alpha value to convert.
     * @returns {number} - Percent value.
     */
    var convertBackAlpha = function(alpha) {
        return alpha / opacityMax;
    };

    /**
     * Create a html option element.
     * @param {string} text - Text of the option.
     * @param {string} value - Value of the option.
     * @returns {HTMLOptionElement} - Option element.
     */
    var createOption = function(text, value) {
        var option = document.createElement("option");
        option.text = text;
        option.value = value;
        return option;
    };

    /**
     * Enable custom color.
     * @param {boolean} value - Custom color activation.
     * @param {boolean} noImport - Disable import color to jsColor.
     */
    var customColor = function(value, noImport) {
        localTemperature.iscustom = value;
        document.getElementById("active-custom-color").checked = value;
        document.getElementById("color").style.display = value ? "block" : "none";

        if (value && !noImport)
            document.getElementById("color").jscolor.importColor();
    };

    /**
     * Disable interface.
     * @param {boolean} saving - Disable interface.
     */
    var displaySaving = function(saving) {
        if (saving) {
            document.getElementById("disable-current").disabled = true;
            document.getElementById("save").disabled = true;
            document.getElementById("use-sync").disabled = true;
        } else {
            document.getElementById("disable-current").disabled = false;
            document.getElementById("save").disabled = false;
            document.getElementById("use-sync").disabled = false;
        }
    };

    /**
     * Event handler of the disable current tab button.
     */
    var eventChangeDisableCurrentTab = function() {
        if (!currentTabIsIgnored)
            ignoreList.push(currentTabUrl);
        else
            ignoreList = ignoreList.filter(function(e) {
                return currentTabUrl != e;
            });

        saveIgnoreList();
    };

    /**
     * Update color from jsColor.
     * @param {object} picker - jsColor picker object.
     */
    var eventChangeJsColor = function(picker) {
        updateColor(picker.toString(), true, true);
    };

    /**
     * Event handler of the opacity input.
     */
    var eventOpacityChange = function() {
        if (this.value != null) {
            setOpacity(this.value);
        }
    };

    /**
     * Initialization.
     */
    var init = function() {
        startBeat();
        localization();

        window.jscolorEventChange = eventChangeJsColor;
        populateTime();
        addEvent();

        fireluxUtils.getBestStorage().then(function(storage) {
            localTemperature = storage.temperature;
            storedTemperature = Object.assign({}, storage.temperature);

            localUseSync = storage.useSync;
            storedUseSync = Object.assign({}, storage.useSync);

            ignoreList = storage.ignoreList;

            checkCurrentTabIsIgnored();

            if (!fireluxUtils.syncStorageAvailable)
                document.getElementById("use-sync-row").style.display = "none";

            document.getElementById("color").value = localTemperature.color;
            setOpacity(null, false);

            // Set the time
            document.getElementById("start-time-hour").value = localTemperature.starthour;
            document.getElementById("end-time-hour").value = localTemperature.endhour;
            document.getElementById("start-time-minute").value = localTemperature.startminute;
            document.getElementById("end-time-minute").value = localTemperature.endminute;

            document.getElementById("use-sync").checked = localUseSync.value;

            customColor(localTemperature.iscustom);

            timerEnabled(localTemperature.timerEnabled);

            document.body.style.display = "block";
        });
    };

    /**
     * Load strings.
     */
    var localization = function() {
        var noColorTitle = browser.i18n.getMessage("panel_noColorTitle");
        document.getElementById("no-color-btn").setAttribute("title", noColorTitle);

        var customColorLabel = browser.i18n.getMessage("panel_customColorLabel");
        document.querySelector("label[for=active-custom-color]").textContent = customColorLabel;

        var opacityLabel = browser.i18n.getMessage("panel_opacityLabel");
        document.getElementById("opacity-label").textContent = opacityLabel;

        var changeAutoLabel = browser.i18n.getMessage("panel_changeAutoLabel");
        document.querySelector("label[for=change-auto]").textContent = changeAutoLabel;

        var sunriseLabel = browser.i18n.getMessage("panel_sunriseLabel");
        document.querySelector("label[for=end-time-hour]").textContent = sunriseLabel;

        var sunsetLabel = browser.i18n.getMessage("panel_sunsetLabel");
        document.querySelector("label[for=start-time-hour]").textContent = sunsetLabel;

        var syncLabel = browser.i18n.getMessage("panel_syncLabel");
        document.querySelector("label[for=use-sync]").textContent = syncLabel;

        var saveLabel = browser.i18n.getMessage("common_saveLabel");
        document.getElementById("save").textContent = saveLabel;
    };

    /**
     * Populate select options for time selection.
     */
    var populateTime = function() {
        for (var i = 0; i < 24; i++) {
            var hour = (i < 10) ? ("" + 0 + i) : i;
            document.getElementById("start-time-hour").appendChild(createOption(hour, hour));
            document.getElementById("end-time-hour").appendChild(createOption(hour, hour));
        }
        for (var i = 0; i < 60; i++) {
            var minute = (i < 10) ? ("" + 0 + i) : i;
            document.getElementById("start-time-minute").appendChild(createOption(minute, minute));
            document.getElementById("end-time-minute").appendChild(createOption(minute, minute));
        }
    };

    /**
     * Refresh the temparature of all tabs.
     * @param {boolean} close - Close panel after update.
     */
    var refreshTabs = function(close) {
        browser.tabs.query({}).then(function(tabs) {
            for (var tab of tabs) {
                browser.tabs.sendMessage(tab.id, { refreshData: true }).catch(function() {});
            }

            if (close)
                setTimeout(function() {
                    window.close();
                }, tabs.length * 10);
        });
    };

    /**
     * Save sync and ignore list configuration.
     */
    var saveSync = function() {
        displaySaving(true);

        var toStore = {
            temperature: storedTemperature,
            useSync: localUseSync,
            ignoreList: ignoreList
        };

        fireluxUtils.save(toStore).then(function() {
            storedTemperature = toStore.temperature;
            storedUseSync = toStore.storedUseSync;
            checkCurrentTabIsIgnored();
            refreshTabs(false);
            displaySaving(false);
        });
    };

    /**
     * Save temparature and ignore list configuration.
     */
    var saveTemperature = function() {
        displaySaving(true);

        var toStore = {
            temperature: localTemperature,
            useSync: localUseSync,
            ignoreList: ignoreList
        };

        fireluxUtils.save(toStore).then(function() {
            storedTemperature = toStore.temperature;
            storedUseSync = toStore.storedUseSync;
            checkCurrentTabIsIgnored();
            refreshTabs(true);
            displaySaving(false);
        });
    };

    /**
     * Save ignore list configuration.
     */
    var saveIgnoreList = function() {
        displaySaving(true);

        var toStore = {
            temperature: storedTemperature,
            useSync: storedUseSync,
            ignoreList: ignoreList
        };

        fireluxUtils.save(toStore).then(function() {
            checkCurrentTabIsIgnored();
            refreshTabs(false);
            displaySaving(false);
        });
    };

    /**
     * Set value of opacity option and update UI.
     * @param {number} value - Alpha value.
     * @param {boolean} fromInput - Value from input.
     */
    var setOpacity = function(value, fromInput) {
        if (fromInput == null)
            fromInput = true;

        if (value != null)
            localTemperature.alpha = convertAlpha(value);

        if (!fromInput)
            document.getElementById("opacity").value = (convertBackAlpha(localTemperature.alpha) * 100);

        document.getElementById("intensity").innerText = (Math.trunc(convertBackAlpha(localTemperature.alpha) * 100) + "%");

        browser.tabs.query({ active: true, currentWindow: true }).then(function(tabs) {
            browser.tabs.sendMessage(tabs[0].id, { temperature: localTemperature });
        });
    };

    /**
     * Update sync activation and save.
     * @param {boolean} value - Sync activation state.
     */
    var setUseSync = function(value) {
        localUseSync.value = value;
        localUseSync.date = new Date();
        saveSync();
    };

    /**
     * Start the beat which checks the closure of the panel.
     */
    var startBeat = function() {
        var beat = function() {
            browser.tabs.query({ active: true, currentWindow: true }).then(function(tabs) {
                browser.tabs.sendMessage(tabs[0].id, { isAlive: true });
            });
        };

        beat();
        setTimeout(startBeat, 250);
    };

    /**
     * Set value of timer enabled option and update UI.
     * @param {boolean} value - Change auto value.
     */
    var timerEnabled = function(value) {
        localTemperature.timerEnabled = value;
        document.getElementById("change-auto").checked = localTemperature.timerEnabled;
        document.getElementById("timer").style.display = localTemperature.timerEnabled ? "block" : "none";
    };

    /**
     * Update color.
     * @param {string} value - Color hex6
     * @param {boolean} isCustom - Value is a custom color.
     * @param {boolean} fromJsColor - Value is come from jsColor.
     */
    var updateColor = function(value, isCustom, fromJsColor) {
        var colorElement = document.getElementById("color");
        if (colorElement.value != value && !fromJsColor) {
            colorElement.value = value;
        }
        localTemperature.color = value;

        if (isCustom != null) {
            customColor(isCustom, fromJsColor);
        }

        if (!fromJsColor) {
            colorElement.jscolor.importColor();
        }

        browser.tabs.query({ active: true, currentWindow: true }).then(function(tabs) {
            browser.tabs.sendMessage(tabs[0].id, { temperature: localTemperature });
        });
    };

    return {
        /**
         * Initialization.
         */
        init: init
    };
})();

firelux.init();