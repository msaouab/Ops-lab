from valid_markup import *  # noqa: F401,F403

def test_examples():
    assert is_valid_markup("<div><b>hi</b></div>") is True
    assert is_valid_markup("<div><b>hi</div></b>") is False
    assert is_valid_markup("<p>line<br/>next</p>") is True
    assert is_valid_markup("</p>") is False


def test_edges():
    assert is_valid_markup("") is True
    assert is_valid_markup("plain text") is True
    assert is_valid_markup("<ul><li>a</li><li>b</li></ul>") is True
    assert is_valid_markup("<ul><li>a</li>") is False
    assert is_valid_markup("<a></a><a></a>") is True
