
### v0.1.0

Initial version

### v0.2.0
* Fixed issue diffing content with changed type and value
* Improved diffing children that have changed - we now try forcing children never to be similar, and also 
letting children that are the same element be similar, and then we take the result with the best weight.
* Tests improved using preferredWidth for magicpen - they should now run everywhere!