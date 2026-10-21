from m3_lru_cache import *  # noqa: F401,F403

def test_m3_q2():
    c = LRUCache(2)
    c.put(1, 1)
    c.put(2, 2)
    assert c.get(1) == 1
    c.put(3, 3)          # evicts 2
    assert c.get(2) == -1
    c.put(4, 4)          # evicts 1
    assert c.get(1) == -1
    assert c.get(3) == 3 and c.get(4) == 4
    c.put(3, 30)         # update, 3 becomes most recent
    c.put(5, 5)          # evicts 4
    assert c.get(4) == -1 and c.get(3) == 30
