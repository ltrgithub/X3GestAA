#!/bin/sh
cat perf-recorded.data | node_modules/streamline/bin/_node --cache node_modules/streamline-flamegraph/lib/collapse  > perf-collapsed.data
[ -f palette.map ] || echo "io->rgb(0,255,255)" > palette.map
cat perf-collapsed.data | egrep -v -e '^node;pipe .*?;io \d+$' | node_modules/streamline-flamegraph/deps/flamegraph.pl --cp  > perf-full.svg
cat perf-collapsed.data | egrep -v -e ';io \d+$' | node_modules/streamline-flamegraph/deps/flamegraph.pl --cp > perf-cpu.svg
