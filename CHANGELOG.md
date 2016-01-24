
### v0.1.0

Initial version

### v0.2.0
* Fixed issue diffing content with changed type and value
* Improved diffing children that have changed - we now try forcing children never to be similar, and also 
letting children that are the same element be similar, and then we take the result with the best weight.
* Tests improved using preferredWidth for magicpen - they should now run everywhere!

### v0.3.0
* Asynchronous diffing,
* support for expect.it(...), including asynchronous assertions

### v0.3.1
* Minor improvements to display of elements with children with attributes that need more than one line

### v0.3.2
*  Fix bug with children being non-exact whilst ignoring the bits that aren't exact. e.g. you ignore extra attributes,
and have an extra attribute on a child, a `contains` check would not find the element.

### v0.4.0
* Class diffing.  The class (or className in the case of React) attribute can be diffed using class semantics, i.e. 
order is unimportant, and optionally extra and/or missing classes can be ignored.

### v0.4.1
* Fix for undefined attributes in actual being treated as "extra" attributes

### v0.5.0
* Improved output for moved elements in children - provides a hint as to the current index
* Fix for moved elements when actual and expected adapters are different (bruderstein/unexpected-react#9) 
(thanks to @yormi for an excellent bug report!)


