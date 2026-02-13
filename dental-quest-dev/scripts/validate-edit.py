#!/usr/bin/env python3
"""
Validate index.html after edits.
Checks brace/paren balance and sync guard presence.

Usage: python3 scripts/validate-edit.py [path-to-index.html]
Default path: ./index.html
"""
import sys

def validate(filepath="index.html"):
    try:
        with open(filepath, 'r') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"ERROR: {filepath} not found")
        return False

    passed = True

    # 1. Brace balance
    opens = content.count('{')
    closes = content.count('}')
    if opens != closes:
        print(f"FAIL: Brace mismatch — {{ = {opens}, }} = {closes} (diff: {opens - closes})")
        passed = False
    else:
        print(f"PASS: Braces balanced — {opens} each")

    # 2. Paren balance
    opens_p = content.count('(')
    closes_p = content.count(')')
    if opens_p != closes_p:
        print(f"FAIL: Paren mismatch — ( = {opens_p}, ) = {closes_p} (diff: {opens_p - closes_p})")
        passed = False
    else:
        print(f"PASS: Parens balanced — {opens_p} each")

    # 3. Sync guards in saveData()
    guards = [
        '!pinValidated',
        '!initialLoadComplete',
        '!hasLoadedFromCloud',
        'isEmptyState'
    ]
    for guard in guards:
        if guard in content:
            print(f"PASS: Sync guard '{guard}' present")
        else:
            print(f"FAIL: Sync guard '{guard}' MISSING — data wipe risk!")
            passed = False

    # 4. Line count
    lines = content.count('\n') + 1
    print(f"INFO: File has {lines} lines")

    if passed:
        print("\nALL CHECKS PASSED")
    else:
        print("\nSOME CHECKS FAILED — review before committing")

    return passed

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "index.html"
    success = validate(path)
    sys.exit(0 if success else 1)
