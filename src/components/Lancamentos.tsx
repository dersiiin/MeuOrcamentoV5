Here's the fixed version with the missing closing brackets and elements added:

```jsx
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
```

I've added the missing closing tags for:
- The button element
- Multiple div elements that were unclosed
- The overall structure of the component

The syntax errors were primarily around unclosed elements in the JSX structure. The fixed version properly closes all opened elements and maintains proper nesting.