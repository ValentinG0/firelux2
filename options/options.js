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

    var ignoreList = [];

    /**
     * Add all event.
     */
    var addEvent = function() {
        document.getElementById("save").addEventListener("click", function() {
            saveIgnoreList();
        });
    };

    /**
     * Initialization.
     */
    var init = function() {
        localization();

        addEvent();

        fireluxUtils.getBestStorage().then(function(result) {
            restoreOptions(result);
        });
    };

    /**
     * Display ignore list to textarea.
     */
    var displayIgnoreList = function() {
        var text = ignoreList.join("\r\n");
        document.getElementById("ignore-list").value = text;
    };

    /**
     * Disable interface.
     * @param {boolean} saving - Disable interface.
     */
    var displaySaving = function(saving) {
        if (saving) {
            document.getElementById("save").disabled = true;
        } else {
            document.getElementById("save").disabled = false;
        }
    };

    /**
     * Load strings.
     */
    var localization = function() {
        var ignoreListLabel = browser.i18n.getMessage("options_ignoreListLabel");
        document.querySelector("label[for=ignore-list]").textContent = ignoreListLabel;

        var infoLabel = browser.i18n.getMessage("options_infoLabel");
        document.getElementById("info").textContent = infoLabel;

        var exampleLabel = browser.i18n.getMessage("options_exampleLabel");
        document.getElementById("example").textContent = exampleLabel;

        var exampleListLabel = browser.i18n.getMessage("options_exampleListLabel");
        document.getElementById("exampleList").textContent = exampleListLabel;


        var saveLabel = browser.i18n.getMessage("common_saveLabel");
        document.getElementById("save").textContent = saveLabel;
    };

    /**
     * Restore configuration.
     * @param {object} storage - Content of storage.
     */
    var restoreOptions = function(storage) {
        ignoreList = storage.ignoreList;

        displayIgnoreList();
        document.body.style.display = "block";
    };

    /**
     * Save the ignore list.
     */
    var saveIgnoreList = function() {
        displaySaving(true);
        var textareaContent = document.getElementById("ignore-list").value;
        var ignoreList = textareaContent.split("\n");

        fireluxUtils.getBestStorage().then(function(result) {
            result.ignoreList = ignoreList;
            fireluxUtils.save(result).then(function(storedData) {
                restoreOptions(storedData);
                displaySaving(false);
            });
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