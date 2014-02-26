/*
Copyright (c) 2013-2014 George Lester

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/**
    Contains all info for an autocomplete field.
*/
function AutocompleteInfo()
{
    // The GUID used for this autocomplete. All major elements created by this script contain an "autocomplete" attribute, which will match this value.
    // This makes it trivial to find and remove autocomplete elements without having this info object.
    this.guid           = null;

    // The <select> element that was originally used to populate the autocomplete box.
    this.select         = null;

    // The <input> which will now carry the id of the original select, and which contains all user input.
    this.textbox        = null;

    // The drop-down list of autocomplete values, which (when clicked) will auto-populate the list.
    this.droplist       = null;

    // The arrow and arrow container which toggle the droplist.
    this.arrow          = null;
    this.arrowContainer = null;

    // individual functions which control aspects of this autocomplete.
    this.mirrorSelectChange             = mirrorSelectChange(this);
    this.mirrorInputChange              = mirrorInputChange(this);
    this.predictInputChange             = predictInputChange(this);
    this.arrowPressed                   = autocompleteArrowPressed(this);
    this.forceAutocompleteValue         = forceAutocompleteValue(this);
    this.toggleAutocompleteDroplist     = toggleAutocompleteDroplist(this);
    this.hideAutocompleteDroplist       = hideAutocompleteDroplist(this);
    this.populateDroplist               = populateDroplist(this);
    this.repopulateDroplist             = repopulateDroplist(this);
    this.resizeAutocomplete             = resizeAutocomplete(this);
}

/**
    Initializes autocomplete upon a select. This function assumes "this" refers to the select in question.
*/
function gautocomplete()
{
    var autocomplete;
    var id, dropValue;

    $(this).each(function ()
    {
        autocomplete = new AutocompleteInfo();

        currentCount = guid();
        autocomplete.guid = currentCount;
        autocomplete.select = $(this);

        // create input and arrow
        autocomplete.container = $("<div>")
            .addClass("autocomplete_container");

        autocomplete.textbox = $("<input>")
            .addClass("autocomplete_input")
            .attr("type", "text")
            .val($(this).val());

        id = $(this).attr("id");
        if (id != null)
        {
            $(this).attr("id", null);
            autocomplete.textbox.attr("id", id);
            autocomplete.textbox.attr("class", $(this).attr("class"));
        }

        autocomplete.arrow = $("<div>")
            .addClass("autocomplete_arrow")
            .addClass("downArrow");

        autocomplete.arrowContainer = $("<div>")
            .attr("autocomplete", currentCount)
            .addClass("autocomplete_arrowContainer")
            .click(autocomplete.toggleAutocompleteDroplist)
            .append(autocomplete.arrow);

        // create droplist
        autocomplete.droplist = $("<div>")
            .addClass("autocomplete_droplist");

        // wire up input to original element.
        $(this).attr("autocomplete", currentCount);
        autocomplete.textbox.attr("autocomplete", currentCount);
        autocomplete.droplist.attr("autocomplete", currentCount);
        autocomplete.arrow.attr("autocomplete", currentCount);

        // hide/replace.
        autocomplete.container.append(autocomplete.textbox).append(autocomplete.arrowContainer);

        $(this).hide().replaceWith(autocomplete.container);
        autocomplete.textbox.after(autocomplete.droplist).after(autocomplete.arrowContainer);
        autocomplete.container.append($(this));

        autocomplete.arrowContainer.outerHeight($(autocomplete.textbox).outerHeight());

        // ensure that changes to select influences the input, and vice versa
        $(this).change(autocomplete.mirrorSelectChange);
        autocomplete.textbox.change(autocomplete.mirrorInputChange).focusout(autocomplete.mirrorInputChange).keyup(autocomplete.predictInputChange).keydown(prepareInputPrediction);
        autocomplete.textbox.keydownCount = 0;
        autocomplete.textbox.keydown(autocomplete.arrowPressed);
        autocomplete.textbox.on("enterpressed", autocomplete.triggerChange);
        autocomplete.textbox.focusout(autocomplete.triggerChange);

        // ensure that droplist is hidden if not clicked by user
        $(document).on("mousedown.autocomplete", getAutocompleteClickHandler(autocomplete));
    });
}


function getAutocompleteClickHandler(autocomplete)
{
    return function (e)
    {
        if (autocomplete.droplist.is(":visible") &&
            autocomplete.droplist.has(e.target).length === 0 && autocomplete.droplist[0] !== e.target &&
            autocomplete.arrowContainer.has(e.target).length === 0 && autocomplete.arrowContainer[0] !== e.target)
        {
            autocomplete.droplist.stop().toggle();
        }
    };
}

/**
    Called when an autocomplete <select> has changed its selected option.
    This mirrors whatever is currently in the <select> to the <input> it uses.
*/
function mirrorSelectChange(autocomplete)
{
    return function ()
    {
        // no wired input?
        if (!autocomplete.textbox)
            return false;

        $(autocomplete.textbox).val($(this).val());
    };
}

/**
    Similar to the above, except for when the <input> changes.
    If the <input> contains a value (or partial value) that matches an option in its <select>,
    its value is set to that, and the <select>'s selected option is set to it as well.
*/
function mirrorInputChange(autocomplete)
{
    return function ()
    {
        var targetValue, targetSelect;
        var currentRegex;
        var currentValue;
        
        // no wired select?
        if (!autocomplete.select || autocomplete.select.length <= 0)
            return;

        targetSelect = autocomplete.select[0];
        targetValue = $(this).val();

        // if the current value inside the input matches an option under the select, mirror the select to that option.
        for (var i = 0; i < targetSelect.options.length; i++)
        {
            if (targetSelect.options[i].value == targetValue)
            {
                targetSelect.selectedIndex = i;
                currentValue = autocomplete.select.val();

                if (currentValue !== targetValue)
                    $(this).val(currentValue);

                break;
            }
        }
    }
}

/**
    Attempts to predict what the user is going for, based on what is already typed.
    If the current text of the <input> is the beginning of one of the <option>s of the <select>, fill the box with that value,
    and set the selection of the box to the unwritten portion of the box.
*/
function predictInputChange(autocomplete)
{
    return function (keycode)
    {
        var targetSelect, targetValue, predictiveValue;
        var predictiveRegex;

        if (!this.allowPredict)
            return;

        this.keydownCount--;
        if (this.keydownCount > 0)
            return;

        // no wired select?
        if (!autocomplete.select)
            return;

        targetValue = $(this).val();

        if (targetValue.length <= 0)
            return;

        predictiveRegex = new RegExp("^" + escapeRegex(targetValue), "i");
        targetSelect = autocomplete.select[0];

        for (var i = 0; i < targetSelect.options.length; i++)
        {
            predictiveValue = targetSelect.options[i].value;
            if (targetValue === predictiveValue)
            {
                mirrorInputChange.call(this);
                break;
            }

            if (predictiveRegex.test(predictiveValue))
            {
                $(this).val(predictiveValue);
                this.setSelectionRange(targetValue.length, predictiveValue.length);

                // if the predicted value is exactly the same as the current value, force select mirror
                break;
            }
        }
    };
}

/**
    Checks to see if the pressed key is a key which produces character output (as opposed to, say, CTRL or backspace).
*/
function prepareInputPrediction(keycode)
{
    var inp = String.fromCharCode(event.keyCode);
    this.allowPredict = !keycode.ctrlKey && !keycode.altKey && /[a-zA-Z0-9-_ ]/.test(inp);

    if (this.allowPredict)
        this.keydownCount++;
}

/**
    If the user presses an arrow, this will move the selection up or down, respectively.
*/
function autocompleteArrowPressed(autocomplete)
{
    return function (event)
    {
        var placeModifier;
        var currentValue;
        var targetSelect;

        if (event.which == 40) // up arrow pressed?
            placeModifier = 1;
        else
            if (event.which == 38) // down arrow pressed?
                placeModifier = -1;
            else
                return;

        currentValue = $(this).val();
        targetSelect = autocomplete.select[0];

        for (var i = 0; i < targetSelect.options.length; i++)
        {
            if (targetSelect.options[i].value == currentValue)
            {
                var modifiedPlace;

                modifiedPlace = i + placeModifier;
                if (modifiedPlace < targetSelect.options.length && modifiedPlace >= 0)
                {
                    autocomplete.select.val(targetSelect.options[modifiedPlace].value);
                    autocomplete.select.trigger("change");
                }
                break;
            }
        }
    };
}

/**
    Called when user has selected a droplist item, which should force both <input> and <select> to the selected value
*/
function forceAutocompleteValue(autocomplete)
{
    return function ()
    {
        autocomplete.select.val($(this).text()).trigger("change");
        autocomplete.textbox.val($(this).text()).trigger("change");
        autocomplete.hideAutocompleteDroplist();
    };
}

/**
    Opens or closes the droplist associated with this particular autocomplete item
*/
function toggleAutocompleteDroplist(autocomplete)
{
    return function ()
    {
        var targetSelect;
        var currentValue;

        // if this is not disabled, toggle.
        if ($(this).attr("disabled"))
            return;

        autocomplete.droplist.outerWidth(autocomplete.textbox.outerWidth());
        autocomplete.droplist.toggle();

        autocomplete.populateDroplist();

        // scroll to currently selected item
        currentValue = autocomplete.textbox.val();

        if (currentValue.length > 0)
        {
            targetSelect = autocomplete.select[0];

            for (var i = 0; i < targetSelect.options.length; i++)
            {
                if (targetSelect.options[i].value == currentValue)
                {
                    autocomplete.droplist.scrollTop(i * autocomplete.droplist.children().first().outerHeight());
                    break;
                }
            }
        }
    }
}

/**
    Ensures autocomplete droplist is hidden, no matter its current state.
    This is typically used whenever the user has clicked outside of the droplist.
*/
function hideAutocompleteDroplist(autocomplete)
{
    return function ()
    {
        autocomplete.droplist.hide();
    }
}

/**
    Using the context of a <select>, populates a given [droplist] with dropvalues suitable for use in autocomplete.
    If the [droplist] has dropvalues already, this does nothing.
*/
function populateDroplist(autocomplete)
{
    return function ()
    {
        var targetSelect;
        var dropValue, dropValueClass;

        dropValueClass = " autocomplete_dropvalue";
        targetSelect = autocomplete.select[0];

        if (autocomplete.droplist.children().length <= 0)
            for (var i = 0; i < targetSelect.options.length; i++)
            {
                if (targetSelect.options[i].value.length <= 0)
                    continue;

                dropValue = document.createElement("div");
                dropValue.appendChild(document.createTextNode(targetSelect.options[i].value));
                dropValue.className += dropValueClass;
                $(dropValue).click(autocomplete.forceAutocompleteValue);

                autocomplete.droplist.append(dropValue);
            }
    }
}

/**
    Removes any droplist items for the current droplist.
*/
function repopulateDroplist(autocomplete)
{
    return function ()
    {
        $(this).empty();
        autocomplete.droplist.empty();

        if (!$(this).is(":visible"))
        {
            // if we're already visible, re-pop.
            autocomplete.populateDroplist();
        }
    }
}

/**
    Ensures that all autocomplete elements are properly fit to the window.
*/
function resizeAllAutocomplete()
{
    var autocompleteArrowContainer, autocompleteInput;

    $(".autocomplete_container").each(function ()
    {
        autocompleteArrowContainer = $(this).children(".autocomplete_arrowContainer");
        autocompleteInput = $(this).children(".autocomplete_input");

        $(autocompleteInput).outerWidth($(this).outerWidth() - $(autocompleteArrowContainer).outerWidth() - 1);
    });
}

function resizeAutocomplete(autocomplete)
{
    return function ()
    {
        autocomplete.textbox.outerWidth(autocomplete.container.outerWidth() - autocomplete.arrowContainer.outerWidth() - 1);
    };
}

function triggerChange()
{
    $(this).trigger("change");
    this.keydownCount = 0;
}

/**
 * Generates a GUID string, according to RFC4122 standards.
 * @returns {String} The generated GUID.
 * @example af8a8416-6e18-a307-bd9c-f2c947bbb3aa
 * @author Slavik Meltser (slavik@meltser.info).
 * @link http://slavik.meltser.info/?p=142
 */
function guid()
{
    function _p8(s)
    {
        var p = (Math.random().toString(16) + "000000000").substr(2, 8);
        return s ? "-" + p.substr(0, 4) + "-" + p.substr(4, 4) : p;
    }
    return _p8() + _p8(true) + _p8(true) + _p8();
}

/**
    Takes the given [target], and escapes it for literal use in a regexp.
    Largely copied from Google closure library function.
*/
function escapeRegex(target)
{
    return String(target).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').replace(/\x08/g, '\\x08');
}

jQuery.fn.gautocomplete = gautocomplete;

$(document).off("keyup.enterpressed", "input");
$(document).on("keyup.enterpressed", "input", function (e)
{
    if (e.keyCode == 13)
    {
        e.preventDefault();
        e.stopPropagation();

        $(this).trigger("enterpressed");
    }
    return false;
});