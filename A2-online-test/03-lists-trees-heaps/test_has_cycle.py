from has_cycle import *  # noqa: F401,F403

from structures import to_linked


def test_cycle():
    head = to_linked([3, 2, 0, -4])
    assert has_cycle(head) is False
    head.next.next.next.next = head.next
    assert has_cycle(head) is True
    assert has_cycle(None) is False
    one = to_linked([1])
    one.next = one
    assert has_cycle(one) is True
