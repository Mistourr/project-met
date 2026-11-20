<!-- Histogram of the collection: how many objects start in each period of `years` years. -->

<script lang="ts">
    import { attachAmChart } from "@amcharts/amcharts5-svelte";
    import * as am5 from "@amcharts/amcharts5";
    import * as am5xy from "@amcharts/amcharts5/xy";
    import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
    import am5themes_ResponsiveMax from "@amcharts/amcharts5/themes/ResponsiveMax";
    import { metMuseumHttpClient } from "#lib/api/metmuseum.ts";
    import { countPerPeriod, histogramRows, type Period, type HistogramRow } from "#lib/stats/periods.ts";

    const { years = 100 }: { years?: number } = $props();

    // ~200 requests to build, and the counts barely move: keep them a week.
    const CACHE_DAYS = 7;
    const cacheKey = $derived(`met:periods:${years}:v1`);

    let rows = $state.raw<HistogramRow[]>();
    let requests = $state(0);
    let error = $state<string>();

    function cached(key: string): Period[] | undefined {
        try {
            const saved = JSON.parse(localStorage.getItem(key) ?? "null");
            if (saved && Date.now() - saved.savedAt < CACHE_DAYS * 86_400_000) return saved.periods;
        } catch {}
    }

    function save(key: string, periods: Period[]) {
        try {
            localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), periods }));
        } catch {}
    }

    // Effects only run in the browser, so this never queries the API during SSR.
    $effect(() => {
        const key = cacheKey;
        const length = years;
        const fromCache = cached(key);
        if (fromCache) {
            rows = histogramRows(fromCache, length);
            return;
        }
        let stale = false; // `years` changed before this one finished
        rows = undefined;
        requests = 0;
        countPerPeriod({
            years: length,
            startingFrom: async (year) =>
                (await metMuseumHttpClient.search({ q: "*", dateBegin: year, dateEnd: 3000, limit: 1 })).total,
            onProgress: (n) => !stale && (requests = n),
        })
            .then((periods) => {
                save(key, periods);
                if (!stale) rows = histogramRows(periods, length);
            })
            .catch((e) => !stale && (error = e instanceof Error ? e.message : String(e)));
        return () => (stale = true);
    });

    let chart = $state.raw<{ xAxis: am5xy.CategoryAxis<am5xy.AxisRenderer>; series: am5xy.ColumnSeries }>();

    function buildChart(root: am5.Root) {
        root.setThemes([am5themes_Animated.new(root), am5themes_ResponsiveMax.new(root)]);
        root.numberFormatter.set("numberFormat", "#,###");

        const xyChart = root.container.children.push(
            am5xy.XYChart.new(root, { panX: true, wheelX: "panX", wheelY: "zoomX", pinchZoomX: true })
        );
        xyChart.set("cursor", am5xy.XYCursor.new(root, { behavior: "none" }));

        const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 40 });
        xRenderer.labels.template.setAll({ rotation: -45, centerY: am5.p50, centerX: am5.p100, fontSize: 11 });
        // The category is a unique key; show the row's label instead.
        xRenderer.labels.template.adapters.add(
            "text",
            (text, target) => (target.dataItem?.dataContext as HistogramRow | undefined)?.label ?? text
        );
        const xAxis = xyChart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: "key", renderer: xRenderer }));

        // From a few objects in the Palaeolithic to ~150,000 in the 1800s:
        // on a linear scale most bars would be invisible.
        const yAxis = xyChart.yAxes.push(
            am5xy.ValueAxis.new(root, { logarithmic: true, min: 1, renderer: am5xy.AxisRendererY.new(root, {}) })
        );
        yAxis.children.unshift(
            am5.Label.new(root, { text: "Objects (log scale)", rotation: -90, y: am5.p50, centerX: am5.p50 })
        );

        const series = xyChart.series.push(
            am5xy.ColumnSeries.new(root, {
                xAxis,
                yAxis,
                categoryXField: "key",
                valueYField: "count",
                tooltip: am5.Tooltip.new(root, { labelText: "{range}: {valueY} objects" }),
            })
        );
        series.columns.template.setAll({ width: am5.percent(90), strokeOpacity: 0 });

        chart = { xAxis, series };
    }

    $effect(() => {
        if (!chart || !rows) return;
        const { xAxis, series } = chart;
        // Empty periods have no bar: a log scale can't draw zero.
        const data = rows.map((row) => (row.kind === "period" && row.count > 0 ? row : { ...row, count: undefined }));
        xAxis.data.setAll(data);
        series.data.setAll(data);

        // amCharts 5 has no axis breaks, so a long run of empty periods is one
        // shaded slot on the axis instead.
        xAxis.axisRanges.clear();
        for (const row of rows) {
            if (row.kind !== "gap") continue;
            const range = xAxis.createAxisRange(xAxis.makeDataItem({ category: row.key }));
            range.get("grid")?.set("forceHidden", true);
            range.get("label")?.set("forceHidden", true);
            range.get("axisFill")?.setAll({
                visible: true,
                fill: am5.color(0x888888),
                fillOpacity: 0.15,
                tooltipText: `${row.range} (${row.years.toLocaleString("en")} years)`,
                tooltip: am5.Tooltip.new(xAxis.root, {}),
            });
        }
    });
</script>

<div class="relative w-full h-full">
    <div class="w-full h-full" {@attach attachAmChart(buildChart)}></div>
    {#if !rows}
        <p class="absolute inset-0 flex items-center justify-center text-gray-600">
            {#if error}
                <span class="text-red-600">{error}</span>
            {:else}
                Counting the collection, {years} years at a time… ({requests} requests)
            {/if}
        </p>
    {/if}
</div>
