## What is it?

A script to convert a standard select element into a control that the user can type text into, and receive automatic suggestions for what the rest of their text could be. And which allows you to keep using the same element ID and event handlers.

## Why not jquery-ui-autocomplete?

jquery-ui-autocomplete is a fantastic plugin, and is very good for small lists of items, especially if the items are not similar. Unfortunately, because of how it operates, scaling up the number of items it can handle is difficult. Every keypress has the potential to create a DOM element for every item in your list. It doesn't matter when you are only dealing with a hundred entries or so, but when trying to use it for thousands of items, it can cause slowdowns or crashes on your page.

Worse, jquery-ui-autocomplete doesn't actually autofill, only gives suggestions. And it doesn't have an easy way for a user to drop the list down to view all items (similar to a select).

This script provides that functionality, without the performance pitfalls. This is built for a specific use case, and is not intended to replace jquery-ui-autocomplete in all circumstances.

Want to see a [live demo](http://glester.com/gautocomplete) that highlights some of these behaviors?

## How do I use it?

If you're like me, you might appreciate a [live demo](http://glester.com/gautocomplete) more than lots of exposition.

Download the gautocomplete.js file, and the gautocomplete.css file. Include them in the head element of your page. Then, follow this pattern.

```
<select id="test">
    <option value="a">a</option>
    <option value="b">b</option>
</select>
```

`$("#test").gautocomplete();`

In this example, 'test' used to be a select, but now refers to the input element which the user sees.
But the original select element still has all the event handlers you put onto it,
and this script ensures that the original select's "selected index" will match whatever
is typed into the input.
This way, you can grab data from either the original select or the new autofill-enabled input element, and get the same result! Data changes to the underlying select are automatically picked up, and represented in the input element as well.

There are currently no optional parameters for this script. It fills a specific niche. If you'd like to see something specific, contact me!

## Am I allowed to use it?

This script is [MIT licensed](http://opensource.org/licenses/MIT) That means you're free to download, use, and abuse the script in any application (commercial, personal, or otherwise). 

That said, if you'd like to distribute modified copies of the script, please contact me. Very likely, I'll incorporate your patch into the main branch, and anyone can benefit from your work.