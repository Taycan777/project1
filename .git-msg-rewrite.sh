#!/usr/bin/env bash
set -e
# Replace exact commit message across all refs
git filter-branch -f --msg-filter '\''sed -e "s/^chore: sync latest local changes$/Практическая работа 3/"'\'' -- --all
