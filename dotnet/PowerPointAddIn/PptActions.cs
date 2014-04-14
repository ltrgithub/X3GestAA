using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Office.Interop.PowerPoint;
using Microsoft.Office.Interop.Excel;
using System.Windows.Forms;
using System.Web.Script.Serialization;
using Microsoft.VisualBasic;

namespace PowerPointAddIn
{
    public class ColumnInfo
    {
        public string propertyName;
        public int dataIndex;
        public int worksheetIndex;
    }

    public class TableInfo 
    {
        List<ColumnInfo> columns = new List<ColumnInfo>();
        public int rowcount = 0;

        public void addColumn(string name, int dataIndex, int worksheetIndex)
        {
            ColumnInfo ci = new ColumnInfo();
            ci.propertyName = name;
            ci.dataIndex = dataIndex;
            ci.worksheetIndex = worksheetIndex;
            columns.Add(ci);
        }

        public int dataToWorksheetIdx(int idx)
        {
            foreach (ColumnInfo ci in columns)
            {
                if (ci.dataIndex == idx)
                {
                    return ci.worksheetIndex;
                }
            }
            return -1;
        }
        public int worksheetToDataIdx(int idx)
        {
            foreach (ColumnInfo ci in columns)
            {
                if (ci.worksheetIndex == idx)
                {
                    return ci.dataIndex;
                }
            }
            return -1;
        }
        public int nameToWorksheetIdx(string name)
        {
            foreach (ColumnInfo ci in columns)
            {
                if (ci.propertyName.Equals(name))
                {
                    return ci.worksheetIndex;
                }
            }
            return -1;
        }
    }
   
    public class PptActions
    {
        public BrowserDialog browserDialog = null;
        private JavaScriptSerializer ser = new JavaScriptSerializer();
        private const string SYRACUSE_CHART_PREFIX = "__SYRACUSE_CHART__";

        private int chartCount;
        private int chartsDone;

        public PptActions(BrowserDialog browserDialog)
        {
            this.browserDialog = browserDialog;
        }

        public void RefreshChartsCurrentSlide()
        {
            Presentation pres = null;
            try
            {
                pres = Globals.PowerPointAddIn.Application.ActiveWindow.Presentation;
            }
            catch (Exception) { }
            if (pres == null)
            {
                return;
            }
            List<Microsoft.Office.Interop.PowerPoint.Chart> charts = getChartsOnCurrentSlide();
            refreshCharts(pres, charts);
        }
        public void RefreshChartsAllSlides() 
        {
            Presentation pres = null;
            try
            {
                pres = Globals.PowerPointAddIn.Application.ActiveWindow.Presentation;
            }
            catch (Exception) { }
            if (pres == null)
                return;
            List<Microsoft.Office.Interop.PowerPoint.Chart> charts = getChartsInCurrentPresentation();
            refreshCharts(pres, charts);
        }

        private List<Microsoft.Office.Interop.PowerPoint.Chart> getChartsOnCurrentSlide()
        {
            List<Microsoft.Office.Interop.PowerPoint.Chart> charts = new List<Microsoft.Office.Interop.PowerPoint.Chart>();
            Slide slide = null;
            try
            {
                slide = Globals.PowerPointAddIn.Application.ActiveWindow.View.Slide;
            }
            catch (Exception) { }
            if (slide != null)
            {
                listChartsOnSlide(slide, charts);
            }
            return charts;
        }
        private List<Microsoft.Office.Interop.PowerPoint.Chart> getChartsInCurrentPresentation()
        {
            List<Microsoft.Office.Interop.PowerPoint.Chart> charts = new List<Microsoft.Office.Interop.PowerPoint.Chart>();
            Presentation pres = null;
            try
            {
                pres = Globals.PowerPointAddIn.Application.ActiveWindow.Presentation;
            }
            catch (Exception) { }
            if (pres != null)
            {
                listChartsInPresentation(pres, charts);
            }
            return charts;
        }

        private void listChartsInPresentation(Presentation pres, List<Microsoft.Office.Interop.PowerPoint.Chart> charts)
        {
            foreach (Slide slide in pres.Slides)
            {
                listChartsOnSlide(slide, charts);
            }
        }
        private void listChartsOnSlide(Slide slide, List<Microsoft.Office.Interop.PowerPoint.Chart> charts)
        {
            foreach (Microsoft.Office.Interop.PowerPoint.Shape shape in slide.Shapes)
            {
                try
                {
                    Microsoft.Office.Interop.PowerPoint.Chart chart = shape.Chart;
                    if (isSyracuseChartName(chart.Name))
                    {
                        charts.Add(chart);
                    }
                }
                catch (Exception) { }
            }
        }
        public void addChartSlide(Presentation pres, DocumentWindow win, PptCustomData cd, int newSlideIndex)
        {
            try
            {
                int idx = 0;
                if (newSlideIndex == -1)
                {
                    idx = 0;
                }
                else if (newSlideIndex == 1)
                {
                    try { idx = pres.Slides.Count; }
                    catch (Exception) { };
                }
                else
                {
                    try { idx = win.View.Slide.SlideIndex; }
                    catch (Exception) { };
                }

                Slide sl = pres.Slides.Add(idx + 1, PpSlideLayout.ppLayoutChart);
                win.View.Slide = sl;

                try
                {
                    Microsoft.Office.Interop.PowerPoint.Shape sh = sl.Shapes.AddChart(Microsoft.Office.Core.XlChartType.xl3DColumn);
                    Microsoft.Office.Interop.PowerPoint.Chart c = sh.Chart;
                    c.ChartData.Activate();
                    Workbook wb = (Workbook)c.ChartData.Workbook;                
                    wb.Application.Visible = false;
                    wb.Application.ScreenUpdating = false;
                    cd.setActionType("ppt_populate_worksheet");

                    PptCustomXlsData xcd = PptCustomXlsData.getFromDocument(wb, true);
                    xcd.setServerUrl(cd.getServerUrl());
                    xcd.setResourceUrl(cd.getResourceUrl());
                    xcd.setForceRefresh(false);
                    xcd.writeDictionaryToDocument();
                    xcd.setChart(c);
                    browserDialog.loadPage("/msoffice/lib/ppt/ui/main.html?url=%3Frepresentation%3Dppthome.%24dashboard", cd, xcd, xcd.getServerUrl());
                }
                catch (Exception) { }
            }
            catch (Exception e)
            {
                MessageBox.Show(e.Message + ":" + e.StackTrace);
                browserDialog.Visible = false;
            }
        }

        private void refreshCharts(Presentation pres, List<Microsoft.Office.Interop.PowerPoint.Chart> charts)
        {
            refreshChartsInit(pres, charts);
        }

        public void refreshChartsInit(Presentation pres, List<Microsoft.Office.Interop.PowerPoint.Chart> charts)
        {
            PptCustomData cd = PptCustomData.getFromDocument(pres, true);
            cd.setActionType("ppt_refresh_charts");
            cd.setCharts(charts);
            chartCount = cd.getCharts().Count;
            chartsDone = 0;
            if (chartCount > 0)
            {
                Microsoft.Office.Interop.PowerPoint.Chart chart = cd.getCharts()[0];

                chart.ChartData.Activate();
                Workbook wb = (Workbook)chart.ChartData.Workbook;
                wb.Application.Visible = false;
                wb.Application.ScreenUpdating = false;

                PptCustomXlsData xcd = PptCustomXlsData.getFromDocument(wb, true);
                xcd.setChart(chart);
                PptAddInJSExternal external = new PptAddInJSExternal(cd, xcd, browserDialog);
                browserDialog.loadPage("/msoffice/lib/ppt/ui/main.html?url=%3Frepresentation%3Dppthome.%24dashboard", external, xcd.getServerUrl());
            }
        }

        // Called by JS
        public void refreshNextChart(Presentation pres)
        {
            PptAddInJSExternal external = browserDialog.getExternal();
            PptCustomData cd = external.getPptCustomData();
            if (cd == null)
                return;

            bool tryNext = true;
            while (tryNext)
            {
                tryNext = false;
                if (cd.getCharts().Count > 0)
                {
                    Microsoft.Office.Interop.PowerPoint.Chart chart = cd.getCharts()[0];
                    cd.getCharts().Remove(chart);
                }

                if (cd.getCharts().Count > 0)
                {
                    try
                    {
                        Microsoft.Office.Interop.PowerPoint.Chart chart = cd.getCharts()[0];
                        chart.ChartData.Activate();
                        Workbook wb = (Workbook)chart.ChartData.Workbook;
                        wb.Application.Visible = false;

                        PptCustomXlsData xcd = PptCustomXlsData.getFromDocument(wb, true);
                        xcd.setChart(chart);
                        external.setPptCustomXlsData(xcd);
                        browserDialog.loadPage("/msoffice/lib/ppt/ui/main.html?url=%3Frepresentation%3Dppthome.%24dashboard", external, xcd.getServerUrl());

                        return;
                    }
                    catch (Exception)
                    {
                        tryNext = true;
                    }
                }
            }
            CommonUtils.ShowInfoMessage(
                String.Format(
                    global::PowerPointAddIn.Properties.Resources.MSG_SAVE_REFRESH_DONE,
                    chartsDone,
                    chartCount),
                    global::PowerPointAddIn.Properties.Resources.MSG_INFO_TITLE);

            browserDialog.Visible = false;
        }

        // Called by JS
        public void addDataToWorksheet(Presentation pres, PptCustomXlsData customXlsData, String jsonData)
        {
            Workbook wb = customXlsData.getWorkbook();
            if (wb == null)
                return;

            Worksheet ws = wb.Sheets[1];
            try
            {
                Dictionary<String, object> data = (Dictionary<String, object>)ser.DeserializeObject(jsonData);
                Object[] listData = (Object[])data["$data"];

                // get paging infos
                int startIndex = 1;
                int totalResults = 0;
                int itemsPerPage = 1;
                bool isFirstPage = true;
                bool isLastPage = true;

                try { startIndex = Convert.ToInt32(data["$startIndex"]); } catch (Exception) {  }
                try { totalResults = Convert.ToInt32(data["$totalResults"]); } catch (Exception) {  }
                try { itemsPerPage = Convert.ToInt32(data["$itemsPerPage"]); } catch (Exception) {  }
                try { isFirstPage = Convert.ToBoolean(data["$isFirstPage"]); } catch (Exception) {  }
                try { isLastPage = Convert.ToBoolean(data["$isLastPage"]); } catch (Exception) {  }

                // first chunk of data, clear xls sheet
                if (isFirstPage)
                {
                    ws.Cells.Clear();
                    Object[] columns = (Object[])data["$columns"];
                    addHeadersToWorksheet(pres, wb, ws, customXlsData, columns);
                }
                TableInfo ti = customXlsData.getTableInfo();

                int row = startIndex;
                foreach (Object rowData in listData)
                {
                    Object[] rowDataArray = (Object[])rowData;
                    row++;
                    int columnIndex = 0;
                    int displayIndex;

                    foreach (Object column in rowDataArray)
                    {
                        Dictionary<String, object> colDataCol = (Dictionary<String, object>)column;
                        displayIndex = ti.dataToWorksheetIdx(columnIndex);
                        if (displayIndex > 0)
                        {
                            object o = colDataCol["value"];
                            if (o != null)
                            {
                                ws.Cells[row, displayIndex].Value = o;
                            }
                        }
                        columnIndex++;
                    }

                    ti.rowcount++;
                }

                if (isLastPage)
                {
                    Dictionary<String, object> chartExtensions = (Dictionary<String, object>)data["$chartExtensions"];
                    addingDataFinished(pres, customXlsData, data, chartExtensions);
                    checkRefreshButtons();
                    int anz = wb.Application.Workbooks.Count;
                    if (anz >= 1)
                    {
                        wb.Application.Visible = true;
                        wb.Application.ScreenUpdating = true;
                    }
                    customXlsData.setWorkbook(null);
                    wb.Close();
                    if (anz == 1)
                    {
                        wb.Application.Quit();
                    }                    
                    Globals.PowerPointAddIn.Application.ActiveWindow.Activate();
                    browserDialog.Visible = false;
                    Globals.Ribbons.Ribbon.RibbonUI.ActivateTabMso("TabAddIns");
                }
            }
            catch (Exception e) { 
                MessageBox.Show(e.Message + "\n" + e.StackTrace);
                browserDialog.Visible = false;
            }
        }

        private void addHeadersToWorksheet(Presentation pres, Workbook wb, Worksheet ws, PptCustomXlsData customXlsData, Object[] columns) 
        {
            try
            {
                int col = 0;
                int dcol = 0;

                TableInfo ti = customXlsData.getTableInfo();
                if (ti == null)
                {
                    ti = new TableInfo();
                }
                foreach (Object column in columns)
                {
                    Dictionary<String, object> dictCol = (Dictionary<String, object>)column;
                    int wsIdx = 0;

                    string _orgName = dictCol["_orgName"].ToString();
                    if (!_orgName.StartsWith("$"))
                    {
                        dcol++;
                        wsIdx = dcol;
                        string _title = _orgName;
                        try { _title = dictCol["_title"].ToString(); } catch (Exception) { };
                        ws.Cells[1, dcol].Value = _title;
                    }
                    ti.addColumn(_orgName, col, wsIdx);
                    col++;
                }
                customXlsData.setTableInfo(ti);
            }
            catch (Exception e) 
            { 
                MessageBox.Show(e.Message + "\n" + e.StackTrace); 
            }
        }

        private void addingDataFinished(Presentation pres, PptCustomXlsData customXlsData, Dictionary<String, object> data, Dictionary<String, object> chartExtensions)
        {
            Workbook wb = customXlsData.getWorkbook();
            try
            {
                Worksheet ws = wb.Sheets[1];
                TableInfo ti = customXlsData.getTableInfo();

                Microsoft.Office.Interop.PowerPoint.Chart chart = customXlsData.getChart();
                Microsoft.Office.Interop.PowerPoint.SeriesCollection sc = chart.SeriesCollection() as Microsoft.Office.Interop.PowerPoint.SeriesCollection;

                Dictionary<String, object> cube = (Dictionary<String, object>)chartExtensions["$cube"];
                Dictionary<String, object> measures = (Dictionary<String, object>)cube["$measures"];

                int oldSeriesCount = sc.Count;
                chart.HasLegend = true;
                Microsoft.Office.Interop.PowerPoint.Series firstSeries = null;
                foreach (string key in measures.Keys)
                {
                    Dictionary<String, object> measure = (Dictionary<String, object>)measures[key];
                    string property = key;
                    try { property = measure["$property"].ToString(); } catch (Exception) {chart.HasLegend = false; };
                    
                    string title = property;
                    try { title = measure["$title"].ToString(); } catch (Exception) { };
                    int col = ti.nameToWorksheetIdx(property);
                    if (col > 0)
                    {
                        ws.Cells[1, col].Address();
                        string start = ws.Cells[1, col].Address();
                        string end = ws.Cells[1 + ti.rowcount, col].Address();
                        string range = start + ":" + end;

                        Microsoft.Office.Interop.PowerPoint.Series s = sc.Add(range, Microsoft.Office.Interop.PowerPoint.XlRowCol.xlColumns, true, false);
                        if (firstSeries == null)
                        {
                            firstSeries = s;
                        }

                        string style = "stick";
                        bool stacked = false;
                        bool normalized = false;
                        string group = "";

                        try { style = cube["$style"].ToString(); } catch (Exception) { }
                        try { style = measure["$style"].ToString(); } catch (Exception) { }
                        try { stacked = (bool)measure["$isStacked"]; } catch (Exception) { }
                        try { normalized = (bool)measure["$isNormalized"]; } catch (Exception) { }
                        try { group = measure["$stackingGroup"].ToString(); } catch (Exception) { }

                        switch (style)
                        {
                            case "line":
                                s.ChartType = Microsoft.Office.Core.XlChartType.xlLine;
                                break;
                            case "spline":
                                s.ChartType = Microsoft.Office.Core.XlChartType.xlLine;
                                s.Smooth = true;
                                break;
                            case "column":
                            case "stick":
                                if (stacked)
                                {
                                    if (normalized)
                                    {
                                        s.ChartType = Microsoft.Office.Core.XlChartType.xlColumnStacked100;
                                    }
                                    else
                                    {
                                        s.ChartType = Microsoft.Office.Core.XlChartType.xlColumnStacked;
                                    }
                                }
                                else
                                {
                                    s.ChartType = Microsoft.Office.Core.XlChartType.xlColumnClustered;
                                }
                                break;
                            case "point":
                                s.ChartType = Microsoft.Office.Core.XlChartType.xlXYScatter;
                                break;
                            case "area":
                            case "areaspline": // areaspline not supported yet (no smoothed area available)
                                if (stacked)
                                {
                                    if (normalized)
                                    {
                                        s.ChartType = Microsoft.Office.Core.XlChartType.xlAreaStacked100;
                                    }
                                    else
                                    {
                                        s.ChartType = Microsoft.Office.Core.XlChartType.xlAreaStacked;
                                    }
                                }
                                else
                                {
                                    s.ChartType = Microsoft.Office.Core.XlChartType.xlArea;
                                }
                                break;
                            case "spiderweb":
                                s.ChartType = Microsoft.Office.Core.XlChartType.xlRadar;
                                break;
                        }

                        s.Name = title;
                        try
                        {
                            s.AxisGroup = Microsoft.Office.Interop.PowerPoint.XlAxisGroup.xlPrimary;
                        }
                        catch (Exception) { }
                    }
                }
                int seriesToDelete = oldSeriesCount;
                while (seriesToDelete-- > 0)
                {
                    Microsoft.Office.Interop.PowerPoint.Series si = sc.Item(1);
                    try
                    {
                        // copy colors, otherwise colors change on every refresh of the chart
                        Microsoft.Office.Interop.PowerPoint.Series si_new = sc.Item(1 + oldSeriesCount);
                        si_new.Format.Fill.BackColor = si.Format.Fill.BackColor;
                        si_new.Format.Fill.ForeColor = si.Format.Fill.ForeColor;
                        si_new.Format.Line.BackColor = si.Format.Line.BackColor;
                        si_new.Format.Line.ForeColor = si.Format.Line.ForeColor;
                    }
                    catch (Exception) { }
                    si.Delete();
                }

                // Highly simplified!!!
                object[] axes = (object[])chartExtensions["$axes"];
                Dictionary<String, object> dictAxe = (Dictionary<String, object>)axes[0];
                object[] hierarchies = (object[])dictAxe["$hierarchies"];
                string hierarchie = ((object[])hierarchies[0])[0].ToString();

                Dictionary<String, object> cubeHierarchies = (Dictionary<String, object>)cube["$hierarchies"];
                Dictionary<String, object> cubeHierarchie = (Dictionary<String, object>)cubeHierarchies[hierarchie];
                string htitle = cubeHierarchie["$title"].ToString();
                string hproperty = ((object[])cubeHierarchie["$properties"])[0].ToString();

                if (firstSeries != null)
                {
                    int catCol = ti.nameToWorksheetIdx(hproperty);

                    string[] categories = new string[ti.rowcount];
                    if (catCol > 0)
                    {
                        for (int cat = 2; cat <= ti.rowcount + 1; cat++)
                        {
                            object o = ws.Cells[cat, catCol].Value;
                            if (o != null)
                            {
                                categories[cat - 2] = o.ToString();
                            }
                        }
                    }
                    firstSeries.XValues = categories;
                }
                try
                {
                    chart.Axes(Microsoft.Office.Interop.PowerPoint.XlAxisType.xlCategory, Microsoft.Office.Interop.PowerPoint.XlAxisGroup.xlSecondary).Delete();
                }
                catch (Exception) { }
                
                string header = cube["$title"].ToString();
                if (htitle != "")
                {
                    header = header + " / " + htitle;
                }
                string cstyle = "stick";
                try { cube["$style"].ToString(); } catch (Exception) { }

                if ("pie".Equals(cstyle))
                {
                    chart.ChartType = Microsoft.Office.Core.XlChartType.xlPie;
                    chart.HasLegend = true;
                    for (int ser = 1; ser <= sc.Count; ser++)
                    {
                        Microsoft.Office.Interop.PowerPoint.Series si = sc.Item(ser);
                        si.HasDataLabels = true;
                    }
                }
                else
                {
                    // Set lowest level of value axis (e.h. for setting it below zero)
                    // chart.Axes(Microsoft.Office.Interop.PowerPoint.XlAxisType.xlValue, Microsoft.Office.Interop.PowerPoint.XlAxisGroup.xlPrimary).Crosses = Microsoft.Office.Interop.PowerPoint.XlAxisCrosses.xlAxisCrossesMinimum;
                    // |                           |
                    // |-----------------     =>   |
                    // |                           |____________________

                    try
                    {
                        chart.Axes(Microsoft.Office.Interop.PowerPoint.XlAxisType.xlCategory, Microsoft.Office.Interop.PowerPoint.XlAxisGroup.xlPrimary).TickLabelPosition = Microsoft.Office.Interop.PowerPoint.XlTickLabelPosition.xlTickLabelPositionLow;
                    }
                    catch (Exception) { }
                }

                chart.HasTitle = true;
                chart.ChartTitle.Text = header;

                string chartUUid = "unknown";
                try
                {
                    chartUUid = data["$chartUUID"].ToString();
                }
                catch (Exception) { }
                setSyracuseChartName(chart, chartUUid);
                chart.Refresh();

                chartsDone++;
            }
            catch (Exception e)
            {
                MessageBox.Show(e.Message + "\n" + e.StackTrace); 
            }
        }

        private bool isSyracuseChartName(string name)
        {
            if (name == null)
                return false;
            return name.StartsWith(SYRACUSE_CHART_PREFIX);
        }

        private void setSyracuseChartName(Microsoft.Office.Interop.PowerPoint.Chart chart, string uuid)
        {
            if (isSyracuseChartName(chart.Name))
            {
                return;
            }
            chart.Name = SYRACUSE_CHART_PREFIX + uuid;
        }

        // Helper for debugging
        private static void writeFile(string fileName, string text)
        {
            System.IO.StreamWriter file = new System.IO.StreamWriter(fileName);
            file.WriteLine(text);
            file.Close();
        }

        public void checkRefreshButtons()
        {
            if (getChartsInCurrentPresentation().Count > 0)
            {
                Globals.Ribbons.Ribbon.buttonRefreshAll.Enabled = true;
            }
            else
            {
                Globals.Ribbons.Ribbon.buttonRefreshAll.Enabled = false;
            }
            if (getChartsOnCurrentSlide().Count > 0)
            {
                Globals.Ribbons.Ribbon.buttonRefresh.Enabled = true;
            }
            else
            {
                Globals.Ribbons.Ribbon.buttonRefresh.Enabled = false;
            }
        }
    }
}
