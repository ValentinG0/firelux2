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

    var runtimePort;

    //Predefined color
    var black_colorCode = "000000";
    var orange_colorCode = "FF9329";

    //Opacity config
    var opacityMax = 0.9;
    var opacityRangeMax = 100;

    //Stored data
    var storedTemperature = {
        color: orange_colorCode,
        alpha: 0.3,
        starthour: "00",
        startminute: "00",
        endhour: "00",
        endminute: "00",
        timerenabled: false,
        iscustom: false
    };

    //Local data
    var localTemperature = {
        color: orange_colorCode,
        alpha: 0.3,
        starthour: "00",
        startminute: "00",
        endhour: "00",
        endminute: "00",
        timerenabled: false,
        iscustom: false
    };
    var syncStorageAvailable = false;
    var localUseSync = {
        value: false,
        date: null
    };


    /**
     * Add all event.
     */
    var addEvent = function() {
        document.getElementById("orange").addEventListener("click", function() {
            updateColor(orange_colorCode, false);
        });

        document.getElementById("black").addEventListener("click", function() {
            updateColor(black_colorCode, false);
        });

        document.getElementById("color").addEventListener("change", function() {
            if (this.value != null)
                updateColor(this.value, true);
        });

        document.getElementById("no-color").addEventListener("click", function() {
            setOpacity(0, false);
        });

        document.getElementById("opacity").addEventListener("change", eventOpacityChange);

        document.getElementById("opacity").addEventListener("input", eventOpacityChange);

        document.getElementById("change-auto").addEventListener("change", function() {
            if (this.checked != null)
                timerenabled(this.checked);
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
            save();
        });
    };

    /**
     * Choose and restore data.
     * @param {object} syncStorage - Sync storage data.
     * @param {object} storage - Local storage data.
     */
    var chooseDataToRestore = function(syncStorage, storage) {
        if ((storage == null || storage.temperature == null) &&
            (syncStorage == null || syncStorage.temperature == null)) {
            restoreOptions(null);
            return;
        }

        if (syncStorage == null || syncStorage.temperature == null) {
            if (!isValidStorageObject(storage)) {
                restoreOptions(null);
                return;
            }

            restoreOptions(storage);
            return;
        }

        if (syncStorage.useSync != null && storage.useSync != null && storage.useSync.value && storage.useSync.date < syncStorage.useSync.date) {
            if (!isValidStorageObject(syncStorage)) {
                restoreOptions(null);
                return;
            }

            restoreOptions(syncStorage);
            return;
        }

        if (!isValidStorageObject(storage)) {
            restoreOptions(null);
            return;
        }

        restoreOptions(storage);
    };

    /**
     * Convert percent to alpha.
     * @param {number} value - Percent value to convert.
     */
    var convertAlpha = function(value) {
        return value / opacityRangeMax * opacityMax;
    };

    /**
     * Convert alpha to percent.
     * @param {number} alpha - Alpha value to convert.
     */
    var convertBackAlpha = function(alpha) {
        return alpha / opacityMax;
    };

    /**
     * Create a html option element.
     * @param {string} text - Text of the option.
     * @param {string} value - Value of the option.
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
     * Update color from jsColor.
     * @param {object} picker - jsColor picker object.
     */
    var eventChangeJsColor = function(picker) {
        updateColor(picker.toString(), true, true);
    };

    /**
     * Call on change opacity.
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

        if (browser.storage.sync != null)
            syncStorageAvailable = true;

        window.jscolorEventChange = eventChangeJsColor;
        populateTime();
        addEvent();

        var promises = [];
        promises.push(browser.storage.local.get());

        if (syncStorageAvailable) {
            promises.push(browser.storage.sync.get());
        }

        Promise.all(promises).then(function(result) {
            var syncStorage = null;
            var storage = result[0];

            if (syncStorageAvailable) {
                syncStorage = result[1];
            }

            chooseDataToRestore(syncStorage, storage);
        }).catch(function() {
            restoreOptions(null);
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
     * Checks validity of the storage object. 
     * @param {objeci} - Storage object.
     */
    var isValidStorageObject = function(obj) {
        if (!(obj.hasOwnProperty("temperature") ||
                obj.hasOwnProperty("useSync") ||
                obj.useSync.hasOwnProperty("value") ||
                obj.useSync.hasOwnProperty("date") ||
                obj.temperature.hasOwnProperty("color") ||
                obj.temperature.hasOwnProperty("alpha") ||
                obj.temperature.hasOwnProperty("starthour") ||
                obj.temperature.hasOwnProperty("startminute") ||
                obj.temperature.hasOwnProperty("endhour") ||
                obj.temperature.hasOwnProperty("endminute") ||
                obj.temperature.hasOwnProperty("timerenabled") ||
                obj.temperature.hasOwnProperty("iscustom"))) {
            return false;
        }

        return true;
    };

    /**
     * Load strings.
     */
    var localization = function() {
        var noColorTitle = browser.i18n.getMessage("noColorTitle");
        document.getElementById("no-color-btn").setAttribute("title", noColorTitle);

        var customColorLabel = browser.i18n.getMessage("customColorLabel");
        document.querySelector("label[for=active-custom-color]").textContent = customColorLabel;

        var opacityLabel = browser.i18n.getMessage("opacityLabel");
        document.getElementById("opacity-label").textContent = opacityLabel;

        var changeAutoLabel = browser.i18n.getMessage("changeAutoLabel");
        document.querySelector("label[for=change-auto]").textContent = changeAutoLabel;

        var sunriseLabel = browser.i18n.getMessage("sunriseLabel");
        document.querySelector("label[for=end-time-hour]").textContent = sunriseLabel;

        var sunsetLabel = browser.i18n.getMessage("sunsetLabel");
        document.querySelector("label[for=start-time-hour]").textContent = sunsetLabel;

        var syncLabel = browser.i18n.getMessage("syncLabel");
        document.querySelector("label[for=use-sync]").textContent = syncLabel;

        var saveLabel = browser.i18n.getMessage("saveLabel");
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
        for (var i = 0; i < 61; i++) {
            var minute = (i < 10) ? ("" + 0 + i) : i;
            document.getElementById("start-time-minute").appendChild(createOption(minute, minute));
            document.getElementById("end-time-minute").appendChild(createOption(minute, minute));
        }
    };

    /**
     * Restore configuration.
     * @param {object} storage - Content of storage.
     */
    var restoreOptions = function(storage) {
        if (storage != null) {
            if (storage.temperature != null && !isEmptyObject(storage.temperature)) {
                localTemperature = storage.temperature;
                storedTemperature = storage.temperature;
            }

            if (storage.useSync != null) {
                localUseSync = storage.useSync
            }
        }

        if (!syncStorageAvailable) {
            document.getElementById("use-sync-row").style.display = "none";
        }

        document.getElementById("color").value = localTemperature.color;
        setOpacity(null, false);

        // Set the time
        document.getElementById("start-time-hour").value = localTemperature.starthour;
        document.getElementById("end-time-hour").value = localTemperature.endhour;
        document.getElementById("start-time-minute").value = localTemperature.startminute;
        document.getElementById("end-time-minute").value = localTemperature.endminute;

        document.getElementById("use-sync").checked = localUseSync.value;

        customColor(localTemperature.iscustom);
        timerenabled(localTemperature.timerenabled, true);
        document.body.style.display = "block";
    };

    /**
     * Save configuration.
     */
    var save = function() {
        var storePromises = [];

        var toStore = {
            temperature: localTemperature,
            useSync: localUseSync
        };

        var localStorage = browser.storage.local.set(toStore);
        storePromises.push(localStorage);

        if (toStore.useSync.value) {
            toStore.useSync.date = new Date();
            var syncStorage = browser.storage.sync.set(toStore);
            storePromises.push(syncStorage);
        }

        Promise.all(storePromises).then(function(t) {
            storedTemperature = localTemperature;
            browser.tabs.query({}).then(function(tabs) {
                for (var tab of tabs) {
                    browser.tabs.sendMessage(tab.id, { temperature: localTemperature }).catch(function() {});
                }

                setTimeout(function() {
                    window.close();
                }, tabs.length * 2);
            }).catch(function() {
                console.log("error refresh temperature : ");
                console.log(reason);
            });
        }).catch(function() {
            console.log("error save temperature : ");
            console.log(reason);
        });
    };

    /**
     * Update opacity.
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
            browser.tabs.sendMessage(tabs[0].id, { temperature: localTemperature }).catch(function() {});
        }).catch(function() {});
    };

    /**
     * Update sync activation.
     * @param {boolean} value - Value.
     */
    var setUseSync = function(value) {
        if (value) {
            document.getElementById("save").disabled = true;

            browser.storage.sync.get().then(function(syncStorage) {
                if (syncStorage != null && syncStorage.temperature != null) {
                    localTemperature = syncStorage.temperature;
                    updateColor(localTemperature.color);
                }
                localUseSync.value = value;
                document.getElementById("save").disabled = false;
            }).catch(function() {
                document.getElementById("use-sync").checked = false;
                document.getElementById("save").disabled = false;
            });
        } else {
            browser.storage.local.get().then(function(storage) {
                if (storage != null && storage.temperature != null) {
                    localTemperature = storage.temperature;
                    updateColor(localTemperature.color);
                    setOpacity(null, false);
                }
                localUseSync.value = value;
                document.getElementById("save").disabled = false;
            }).catch(function() {
                localUseSync.value = value;
                document.getElementById("save").disabled = false;
            });
        }
    };

    var startBeat = function() {
        var beat = function() {
            browser.tabs.query({ active: true, currentWindow: true }).then(function(tabs) {
                browser.tabs.sendMessage(tabs[0].id, { isAlive: true }).catch(function() {});
            }).catch(function() {});
        };

        beat();
        setTimeout(startBeat, 250);
    };

    /**
     * 
     * @param {boolean} value - Change auto value.
     * @param {boolean} backup - Restoration.
     */
    var timerenabled = function(value, backup) {
        if (backup == undefined)
            localTemperature.timerenabled = value;

        document.getElementById("change-auto").checked = localTemperature.timerenabled;
        document.getElementById("timer").style.display = localTemperature.timerenabled ? "block" : "none";
    };

    /**
     * Update color.
     * @param {string} value - Color hex6
     * @param {*} isCustom - Value is a custom color.
     */
    var updateColor = function(value, isCustom, noImport) {
        var fromJsColor = true;
        if (document.getElementById("color").value != value && !noImport) {
            fromJsColor = false;
            document.getElementById("color").value = value;
        }
        localTemperature.color = value;

        if (isCustom != null) {
            customColor(isCustom, noImport);
        }

        if (!fromJsColor) {
            document.getElementById("color").jscolor.importColor();
        }

        browser.tabs.query({ active: true, currentWindow: true }).then(function(tabs) {
            browser.tabs.sendMessage(tabs[0].id, { temperature: localTemperature }).catch(function() {});
        }).catch(function() {});
    };

    return {
        init: init
    };
})();

firelux.init();