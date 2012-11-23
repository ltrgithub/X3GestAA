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

        public PptActions(BrowserDialog browserDialog)
        {
            this.browserDialog = browserDialog;
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

                Microsoft.Office.Interop.PowerPoint.Shape sh = sl.Shapes.AddChart(Microsoft.Office.Core.XlChartType.xl3DColumn);
                Microsoft.Office.Interop.PowerPoint.Chart c = sh.Chart;

                c.ChartData.Activate();
                Workbook wb = (Workbook)c.ChartData.Workbook;
                wb.Application.Visible = false;
                cd.setActionType("ppt_populate_worksheet");

                PptCustomXlsData xcd = PptCustomXlsData.getFromDocument(wb, true);
                xcd.setServerUrl(cd.getServerUrl());
                xcd.setResourceUrl(cd.getResourceUrl());
                xcd.setForceRefresh(false);
                xcd.writeDictionaryToDocument();
                xcd.setChart(c);
                browserDialog.loadPage("/msoffice/lib/ppt/ui/main.html?url=%3Frepresentation%3Dppthome.%24dashboard", cd, xcd);
            }
            catch (Exception e)
            {
                MessageBox.Show(e.Message + ":" + e.StackTrace);
                browserDialog.Visible = false;
            }
        }

        public void addDataToWorksheet(Presentation pres, PptCustomXlsData customXlsData, String jsonData)
        {
            Workbook wb = customXlsData.getWorkbook();
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
                            ws.Cells[row, displayIndex].Value = colDataCol["value"].ToString();
                        }
                        columnIndex++;
                    }

                    ti.rowcount++;
                }

                if (isLastPage)
                {
                    Dictionary<String, object> chartExtensions = (Dictionary<String, object>)data["$chartExtensions"];
                    addingDataFinished(pres, customXlsData, chartExtensions);
                }
                browserDialog.Visible = false;
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
                        string _title = dictCol["_title"].ToString();
                        string _type = dictCol["_type"].ToString();
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

        private void addingDataFinished(Presentation pres, PptCustomXlsData customXlsData, Dictionary<String, object> chartExtensions)
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
                chart.HasLegend = false;
                Microsoft.Office.Interop.PowerPoint.Series firstSeries = null;
                foreach (string key in measures.Keys)
                {
                    Dictionary<String, object> measure = (Dictionary<String, object>)measures[key];
                    string property = measure["$property"].ToString();
                    string title = measure["$title"].ToString();
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
                        string style = measure["$style"].ToString();
                        switch (style)
                        {
                            case "line":
                                s.ChartType = Microsoft.Office.Core.XlChartType.xlLine;
                                break;
                            case "spline":
                                s.ChartType = Microsoft.Office.Core.XlChartType.xlLine;
                                s.Smooth = true;
                                break;
                            case "stick":
                                s.ChartType = Microsoft.Office.Core.XlChartType.xlColumnClustered;
                                break;
                            case "point":
                                s.ChartType = Microsoft.Office.Core.XlChartType.xlXYScatter;
                                break;
                            case "area":
                                s.ChartType = Microsoft.Office.Core.XlChartType.xlArea;
                                break;
                        }
                        s.Name = title;
                    }
                }

                while (oldSeriesCount-- > 0)
                {
                    Microsoft.Office.Interop.PowerPoint.Series si = sc.Item(1);
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
                            categories[cat - 2] = ws.Cells[cat, catCol].Value;
                        }
                    }
                    firstSeries.XValues = categories;
                }
                
                string header = cube["$title"].ToString();
                string cstyle = cube["$style"].ToString();
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
                chart.HasTitle = true;
                chart.ChartTitle.Text = header;

                chart.Refresh();
                chart.ChartData.Workbook.Close();
            }
            catch (Exception e)
            {
                MessageBox.Show(e.Message + "\n" + e.StackTrace); 
            }
            wb.Application.Visible = false;
        }

        // Helper for debugging
        private static void writeFile(string fileName, string text)
        {
            System.IO.StreamWriter file = new System.IO.StreamWriter(fileName);
            file.WriteLine(text);
            file.Close();
        }
    }
}
