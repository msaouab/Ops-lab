from m3_sync_minutes import *  # noqa: F401,F403

def test_m3_q1():
    assert sync_minutes(["UOO", "OO.", ".OO"]) == 4
    assert sync_minutes(["UOO", ".OO", "O.O"]) == -1
    assert sync_minutes(["U.U"]) == 0
    assert sync_minutes(["...."]) == 0
    assert sync_minutes(["OUO"]) == 1
