from m1_decode_ways import *  # noqa: F401,F403

def test_m1_q2():
    assert decode_ways("12") == 2
    assert decode_ways("226") == 3
    assert decode_ways("06") == 0
    assert decode_ways("10") == 1
    assert decode_ways("100") == 0
    assert decode_ways("11106") == 2
    assert decode_ways("1" * 40) == 165580141
