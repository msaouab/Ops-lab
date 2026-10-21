"""
Valid markup  ·  Easy  ·  stack, strings  ·  target 15 min

Reported in an online test: check that HTML-like tags are correctly nested.

Given a string containing tags like <b>, </b>, <div>, </div> and plain text,
return True when every opening tag is closed in the right order.
- Tag names are lowercase letters only.
- Self-closing tags like <br/> are always valid and need no closing tag.
- Text between tags is ignored.

    is_valid_markup("<div><b>hi</b></div>")   -> True
    is_valid_markup("<div><b>hi</div></b>")   -> False
    is_valid_markup("<p>line<br/>next</p>")   -> True
    is_valid_markup("</p>")                   -> False

Similar public problem: https://leetcode.com/problems/valid-parentheses/
"""
import re

def is_valid_markup(s: str) -> bool:
    raise NotImplementedError
