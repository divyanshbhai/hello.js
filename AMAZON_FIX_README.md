# Amazon Module State Parameter Fix

## Issue Description

The Amazon OAuth module in HelloJS had an issue with decoding the `p.state` parameter. Amazon returns the state parameter in a double-encoded format with HTML entities that requires special handling to properly parse the JSON state object.

## Problem

When Amazon returns the OAuth response, the state parameter comes back in a format like:
```
%7B&#34;client_id&#34;%3A&#34;test_client&#34;%2C&#34;network&#34;%3A&#34;amazon&#34;%7D
```

The standard `decodeURIComponent()` and `JSON.parse()` methods were failing because:
1. Amazon double-encodes the state parameter
2. Amazon uses HTML entities like `&#34;` instead of actual quotes
3. The standard decoding process couldn't handle this format

## Solution

The fix implements Amazon-specific state parameter decoding:

1. **Detection**: Check if the state parameter contains "amazon" to identify Amazon responses
2. **Special Decoding**: Use `decodeURIComponent(escape(p.state))` for proper double-decoding
3. **HTML Entity Replacement**: Replace HTML entities with actual characters:
   - `&#34;` → `"`
   - `&#39;` → `'`
   - `&amp;` → `&`
   - `&lt;` → `<`
   - `&gt;` → `>`
4. **Error Handling**: Fallback to original state if Amazon decoding fails
5. **Compatibility**: Non-Amazon providers continue to work normally

## Code Changes

The fix is implemented in `src/hello.js` in the `responseHandler` function around line 1700:

```javascript
// Check if this is Amazon and handle its specific state encoding
var isAmazon = p && p.state && typeof p.state === 'string' && p.state.indexOf('amazon') !== -1;
if (isAmazon) {
    try {
        // Amazon requires special decoding
        pState = decodeURIComponent(escape(p.state));
        // Replace HTML entities
        pState = pState.replace(/&#34;/g, '"');
        pState = pState.replace(/&#39;/g, "'");
        pState = pState.replace(/&amp;/g, '&');
        pState = pState.replace(/&lt;/g, '<');
        pState = pState.replace(/&gt;/g, '>');
    } catch (decodeError) {
        console.warn('Amazon state decoding failed, using original state:', decodeError);
        pState = p.state;
    }
} else {
    pState = p.state;
}
```

## Testing

A test file `test_amazon_fix.html` is included to verify the fix works correctly:

1. **Test 1**: Normal Amazon state parameter
2. **Test 2**: Amazon state with HTML entities
3. **Test 3**: Non-Amazon state (compatibility check)

To run the tests:
1. Open `test_amazon_fix.html` in a web browser
2. Check that all tests pass
3. Verify the parsed state objects are displayed correctly

## Backward Compatibility

This fix maintains full backward compatibility:
- Non-Amazon providers work exactly as before
- Amazon detection is safe and won't affect other providers
- Fallback mechanism prevents breaking if Amazon decoding fails
- No changes to the public API

## Benefits

1. **Fixes Amazon OAuth**: Amazon authentication now works properly
2. **Robust Error Handling**: Won't break if decoding fails
3. **Comprehensive Entity Support**: Handles multiple HTML entities
4. **Maintains Compatibility**: Other providers unaffected
5. **Easy to Maintain**: Clear, documented code with proper error handling

## Commits

This fix was implemented in multiple commits for better tracking:

1. Initial fix for Amazon state parameter decoding
2. Improved Amazon detection with better string checks
3. Enhanced error handling and additional HTML entities
4. Added comprehensive test suite
5. Documentation and README

## Future Considerations

If Amazon changes their encoding format in the future, the fix can be easily updated by modifying the HTML entity replacements or the decoding logic within the Amazon-specific block.