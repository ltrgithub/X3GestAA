using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Office.Interop.PowerPoint;
using Microsoft.Office.Interop.Excel;
using System.Windows.Forms;
using System.Web.Script.Serialization;

namespace PowerPointAddIn
{
    public class PptActions
    {
        public BrowserDialog browserDialog = null;
        private JavaScriptSerializer ser = new JavaScriptSerializer();

        public PptActions(BrowserDialog browserDialog)
        {
            this.browserDialog = browserDialog;
        }

        public void addChartSlide(Presentation pres, DocumentWindow win, PptCustomData cd)
        {
            try
            {
                int idx = 0;
                try
                {
                    idx = win.View.Slide.SlideIndex;
                }
                catch (Exception) { };

                Slide sl = pres.Slides.Add(idx + 1, PpSlideLayout.ppLayoutChart);

                Microsoft.Office.Interop.PowerPoint.Shape sh = sl.Shapes.AddChart(Microsoft.Office.Core.XlChartType.xl3DColumn);
                Microsoft.Office.Interop.PowerPoint.Chart c = sh.Chart;

                c.ChartData.Activate();
                Workbook wb = (Workbook)c.ChartData.Workbook;
                Worksheet ws = (Worksheet)wb.Worksheets[1];

                cd.setActionType("ppt_populate_worksheet");

                PptCustomXlsData xcd = PptCustomXlsData.getFromDocument(wb, true);
                xcd.setServerUrl(cd.getServerUrl());
                xcd.setResourceUrl(cd.getResourceUrl());
                xcd.setForceRefresh(false);
                xcd.writeDictionaryToDocument();
                browserDialog.loadPage("/msoffice/lib/ppt/ui/main.html?url=%3Frepresentation%3Dppthome.%24dashboard", cd, xcd);
            }
            catch (Exception e)
            {
                MessageBox.Show(e.Message + ":" + e.StackTrace);
            }
        }

        public void addDataToWorksheet(Presentation pres, Worksheet ws, String jsonData)
        {
            Dictionary<String, object> data = (Dictionary<String, object>)ser.DeserializeObject(jsonData);
            Object[] listData = (Object[]) data["$data"];
            Object[] columns =  (Object[]) data["$columns"];

            int startIndex = Convert.ToInt32(data["$startIndex"]);
            int totalResults = Convert.ToInt32(data["$totalResults"]);
            int itemsPerPage = Convert.ToInt32(data["$itemsPerPage"]);
        }

        public void addDataToWorksheetFinished()
        {
            MessageBox.Show("done!");
        }
    }
}
