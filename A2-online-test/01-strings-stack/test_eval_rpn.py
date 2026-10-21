from eval_rpn import *  # noqa: F401,F403

import pytest


def test_examples():
    assert eval_rpn("2 1 + 3 *") == 9
    assert eval_rpn("4 13 5 / +") == 6
    assert eval_rpn("-7 2 /") == -3
    assert eval_rpn("10 6 9 3 + -11 * / * 17 + 5 +") == 22


def test_single_number():
    assert eval_rpn("42") == 42


def test_invalid():
    with pytest.raises(ValueError):
        eval_rpn("1 +")
    with pytest.raises(ValueError):
        eval_rpn("1 2")
