"""
Module install order  ·  Medium  ·  topological sort  ·  target 25 min

Very ERP: modules declare dependencies in their manifest ("depends").
deps maps each module to the list of modules it depends on. Return an install order where
every module comes after all its dependencies. Among modules that are ready at the same time,
pick the alphabetically smallest first (so the answer is unique). Modules that appear only as
dependencies must be included too. Raise ValueError if there is a circular dependency.

    install_order({"sale": ["base", "product"], "product": ["base"], "base": []})
      -> ["base", "product", "sale"]

Similar public problem: https://leetcode.com/problems/course-schedule-ii/
"""
import heapq

def install_order(deps: dict[str, list[str]]) -> list[str]:
    raise NotImplementedError
