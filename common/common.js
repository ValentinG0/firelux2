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

var fireluxUtils = (function() {

    const minDate = new Date(0, 0, 0, 0, 0, 0, 0);

    const syncStorageAvailable = browser.storage.sync != null;
    const notSuppported = ["about", "addons.mozilla.org"];

    //Predefined color
    const black_colorCode = "000000";
    const orange_colorCode = "FF9329";

    //Local data
    const defaultTemperature = {
        enabled: false,
        enabledByTimer: false,
        color: orange_colorCode,
        alpha: 0.3,
        starthour: "01",
        startminute: "00",
        endhour: "01",
        endminute: "00",
        timerEnabled: false,
        iscustom: false
    };
    const defaultUseSync = {
        value: false,
        date: minDate
    };
    const defaultStorage = {
        temperature: defaultTemperature,
        useSync: defaultUseSync,
        ignoreList: []
    };


    /**
     * Choose data.
     * @param {object} syncStorage - Sync storage data.
     * @param {object} storage - Local storage data.
     * @returns {object} Chosen storage.
     */
    var chooseDataToRestore = function(syncStorage, storage) {
        if (syncStorage.useSync.value && storage.useSync.date < syncStorage.useSync.date)
            return syncStorage;
        else
            return storage;
    };

    /**
     * Clean url.
     * @param {URL} url - Url to clean.
     * @returns {string} Host name.
     */
    var cleanUrl = function(url) {
        if (url == null || (url.protocol != "http:" && url.protocol != "https:"))
            return null;

        var host = url.host;
        var result = host.replace(/^www\./g, "");

        return result;
    };

    /**
     * Check if object is empty.
     * @param {object} obj - Object to test.
     */
    var isEmptyObject = function(obj) {
        for (var name in obj)
            return false;

        return true;
    };

    /**
     * Check the storage object and add defaults if necessary.
     * @param {object} storageObject - Storage object to check.
     * @returns {boolean} Storage object have been modified.
     */
    var checkStorageObject = function(storageObject) {
        if (storageObject == null || isEmptyObject(storageObject)) {
            Object.assign(storageObject, defaultStorage);
            return true;
        }

        var nullDetected = false;
        nullDetected = checkTemperatureObject(storageObject.temperature);
        nullDetected = nullDetected || checkUseSyncObject(storageObject.useSync);

        if (storageObject.ignoreList == null)
            storageObject.ignoreList = [];

        cleanStorageObject(storageObject);

        return nullDetected;
    };

    /**
     * Check the temperature object and add defaults if necessary.
     * @param {object} temperatureObject - Temperature object to check.
     * @returns {boolean} Temperature object have been modified.
     */
    var checkTemperatureObject = function(temperatureObject) {
        if (temperatureObject != null) {

            // Done: temperature.timerenabled renamed to temperature.timerEnabled in version 2.0.1.0
            if (temperatureObject.hasOwnProperty("timerenabled")) {
                temperatureObject.timerEnabled = temperatureObject.timerenabled;
            }

            if (temperatureObject.hasOwnProperty("color") &&
                temperatureObject.hasOwnProperty("alpha") &&
                temperatureObject.hasOwnProperty("starthour") &&
                temperatureObject.hasOwnProperty("startminute") &&
                temperatureObject.hasOwnProperty("endhour") &&
                temperatureObject.hasOwnProperty("endminute") &&
                temperatureObject.hasOwnProperty("timerEnabled") &&
                temperatureObject.hasOwnProperty("iscustom"))
                return false;
        }

        var newTemperature = Object.assign({}, defaultStorage.temperature);
        Object.assign(newTemperature, temperatureObject);
        temperatureObject = newTemperature;

        return true;
    };

    /**
     * Check the UseSync object and add defaults if necessary.
     * @param {object} temperatureObject - UseSync object to check.
     * @returns {boolean} UseSync object have been modified.
     */
    var checkUseSyncObject = function(useSyncObject) {
        if (useSyncObject != null &&
            useSyncObject.hasOwnProperty("value") &&
            useSyncObject.hasOwnProperty("date"))
            return false;

        var newUseSync = Object.assign({}, defaultStorage.useSync);
        Object.assign(newUseSync, useSyncObject);
        useSyncObject = newUseSync;

        return true;
    };

    /**
     * Remove deprecated values.
     * @param {object} storageObject - Storage object.
     */
    var cleanStorageObject = function(storageObject) {
        delete storageObject.temperature["timerenabled"];
    };

    /**
     * Retrieves the best storage to use.
     * @returns {Promise} - Promise which resolve with the chosen storage.
     */
    var getBestStorage = function() {
        var promise = new Promise(function(resolve, reject) {
            var promises = [getLocalStorage()];

            if (syncStorageAvailable)
                promises.push(getSyncStorage());

            Promise.all(promises).then(function(result) {
                var syncStorage = null;
                var localStorage = result[0];

                if (syncStorageAvailable)
                    syncStorage = result[1];

                var selectedStorage = chooseDataToRestore(syncStorage, localStorage);
                resolve(selectedStorage);
            });
        });

        return promise;
    };

    /**
     * Retrieves the local storage.
     * @returns {Promise} - Promise which resolve with the local storage or default value.
     */
    var getLocalStorage = function() {
        return getStorage(browser.storage.local.get(), true);
    };

    /**
     * Retrieves a storage.
     * @param {Promise} getStoragePromise - Promise which resolve with storage data.
     * @param {boolean} saveIfInvalidStorage - Save data if default value is applied.
     * @returns {Promise} - Promise which resolve with the storage or default value.
     */
    var getStorage = function(getStoragePromise, saveIfInvalidStorage) {
        var promise = new Promise(function(resolve, reject) {
            getStoragePromise.then(function(storage) {
                if (checkStorageObject(storage) && saveIfInvalidStorage) {
                    var reolveFunc = function() {
                        resolve(storage);
                    };
                    save(storage).then(reolveFunc, reolveFunc);
                } else
                    resolve(storage);

            }).catch(function() {
                resolve(Object.assign({}, defaultStorage));
            });
        });

        return promise;
    };

    /**
     * Retrieves the sync storage.
     * @returns {Promise} - Promise which resolve with the sync storage or default value.
     */
    var getSyncStorage = function() {
        return getStorage(browser.storage.sync.get(), false);
    };

    /**
     * Logs an error.
     * @param {string} origin - Text which indicates the origin of the error.
     * @param {object} reason - Reason object of the error.
     */
    var logError = function(origin, reason) {
        console.log("Error origin: " + origin);
        console.log(reason);
    };

    /**
     * Save configuration.
     * @param {object} toStore - Storage object to store.
     * @returns {Promise} - Promise which resolve with the stored object.
     */
    var save = function(toStore) {
        var result = new Promise(function(resolve, reject) {
            if (toStore.ignoreList == null)
                toStore.ignoreList = [];

            // Remove null, empty string, duplicated entries and not supported.
            toStore.ignoreList = toStore.ignoreList.filter(function(e, index) { return e != null && e != "" && toStore.ignoreList.indexOf(e) == index && notSuppported.indexOf(e) == -1; });

            var storePromises = [browser.storage.local.set(toStore)];

            if (syncStorageAvailable) {
                if (toStore.useSync.value) {
                    toStore.useSync.date = new Date();
                    storePromises.push(browser.storage.sync.set(toStore));
                } else {
                    for (var key in toStore)
                        if (toStore.hasOwnProperty(key))
                            storePromises.push(browser.storage.sync.remove(key));
                }
            }

            Promise.all(storePromises).then(function() {
                resolve(toStore);
            }).catch(function(reason) {
                logError("save", reason);
                reject(reason);
            });
        });

        return result;
    };


    /**
     * Color utilities.
     */
    var color = (function() {
        /**
         * Convert value to Hex.
         * @param {string|number} c - Component value.
         * @returns {string} - Hex value.
         */
        var componentToHex = function(c) {
            c = parseInt(c);
            if (!Number.isSafeInteger(c))
                return null;

            var hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        };

        /**
         * Convert RGB color to Hex color.
         * @param {string|number} r - Red value.
         * @param {string|number} g - Green value.
         * @param {string|number} b - Blue value.
         * @returns {string} - Hex value (#000000).
         */
        var rgbToHex = function(r, g, b) {
            return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
        };

        /**
         * Convert Hex color to RGB.
         * @param {string} hex - Hex value with # (#000000).
         * @returns {object} - Object with r, g and b values.
         */
        var hexToRgb = function(hex) {
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        };

        return {
            /**
             * Convert RGB color to Hex color.
             * @param {string|number} r - Red value.
             * @param {string|number} g - Green value.
             * @param {string|number} b - Blue value.
             * @returns {string} - Hex value (#000000).
             */
            rgbToHex: rgbToHex,

            /**
             * Convert Hex color to RGB.
             * @param {string} hex - Hex value with # (#000000).
             * @returns {object} - Object with r, g and b values.
             */
            hexToRgb: hexToRgb
        };
    })();

    return {
        // Constants
        minDate: minDate,

        syncStorageAvailable: syncStorageAvailable,
        notSuppported: notSuppported,

        black_colorCode: black_colorCode,
        orange_colorCode: orange_colorCode,


        /**
         * Color utilities.
         */
        color: color,

        /**
         * Clean url.
         * @param {URL} url - Url to clean.
         * @returns {string} Host name.
         */
        cleanUrl: cleanUrl,

        /**
         * Retrieves the best storage to use.
         * @returns {Promise} - Promise which resolve with the chosen storage.
         */
        getBestStorage: getBestStorage,

        /**
         * Save configuration.
         * @param {object} toStore - Storage object to store.
         * @returns {Promise} - Promise which resolve with the stored object.
         */
        save: save
    };
})();