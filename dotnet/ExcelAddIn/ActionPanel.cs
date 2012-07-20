using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Drawing;
using System.Data;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using Microsoft.Office.Interop.Excel;
using Office = Microsoft.Office.Core;
using VB = Microsoft.Vbe.Interop;
using System.Web.Script.Serialization;
using Path = System.IO.Path;
using System.Threading;
using System.Globalization;

namespace ExcelAddIn
{
    public partial class ActionPanel : UserControl
    {
        public Boolean connected;
        //
        public ActionPanel()
        {
            connected = false;
            Thread.CurrentThread.CurrentUICulture = CultureInfo.InstalledUICulture;
            InitializeComponent();
        }

        public HtmlDocument webDocument { get { return webBrowser.Document; } }
        private void _connect(string serverUrl)
        {
            // get server url
            var connectUrl = Globals.ThisAddIn.GetServerUrl();
            //
            try
            {
                webBrowser.Url = new Uri(connectUrl + "/msoffice/lib/excel/html/main.html?url=%3Frepresentation%3Dexcelhome.%24dashboard");
                webBrowser.ObjectForScripting = new External();
                ((External)webBrowser.ObjectForScripting).onLogonHandler = delegate()
                    {
                        // actions after logon
                        // has datasources ?
                        if ((new SyracuseCustomData()).GetCustomDataByName("datasourcesAddress") == "")
                            Globals.ThisAddIn.ShowSettingsForm();
                    };
                webBrowser.Refresh();
                connected = true;
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message + "\n" + ex.StackTrace);
            }
        }

        private void buttonConnect_Click(object sender, EventArgs e)
        {
            Connect("");
        }

        public void Connect(string connectUrl)
        {
            _connect(connectUrl);
        }

        public void RefreshAll()
        {
            if (!connected)
                _connect("");
            //
            webBrowser.Document.InvokeScript("onOfficeEvent", new object[] { "refreshAll" });
        }

        private void button1_Click(object sender, EventArgs e)
        {

            // range update test
//            Range cells = Globals.ThisAddIn.Application.ActiveCell.Worksheet.Range["B2", "G3"];
//            cells.Value = new object[,] { { "1", "2", "3", "8", "7", "6" }, { "10", "9", "8", "7", "6", "5" } };
            // sort test
/*            Range cells = Globals.ThisAddIn.Application.ActiveCell.Worksheet.Range["A2", "G1002"];
            cells.Sort(Globals.ThisAddIn.Application.ActiveCell.Worksheet.Cells[1, 4], 
                XlSortOrder.xlDescending, Type.Missing, Type.Missing, XlSortOrder.xlAscending, Type.Missing, XlSortOrder.xlAscending,
                XlYesNoGuess.xlNo, Type.Missing, Type.Missing, XlSortOrientation.xlSortColumns, XlSortMethod.xlPinYin, XlSortDataOption.xlSortNormal, 
                XlSortDataOption.xlSortNormal, XlSortDataOption.xlSortNormal);
 */
            // querytable test
            //Globals.ThisAddIn.Application.ActiveCell.Worksheet.QueryTables.Add("url://", Type.Missing);
            // names test
/*            Worksheet ws = Globals.ThisAddIn.Application.ActiveCell.Worksheet;
            foreach (Name n in ws.Names)
            {
                MessageBox.Show(n.Name + "-" + n.RefersTo);
            }
 */
            // discontinue range update
 /*           Range cells = Globals.ThisAddIn.Application.ActiveCell.Worksheet.Range["B2:B3,D2:E3"];
            cells.Value = new object[,] { { "1", "2", "3", "8", "7", "6" }, { "10", "9", "8", "7", "6", "5" } };
  */
            // document properties
/*            Office.DocumentProperties props = (Office.DocumentProperties)Globals.ThisAddIn.Application.ActiveWorkbook.CustomDocumentProperties;
            foreach (Office.DocumentProperty prop in props)
            {
                MessageBox.Show(prop.Name + ":" + prop.Value);
            }*/
/*            Worksheet activeSheet = (Worksheet)Globals.ThisAddIn.Application.ActiveWorkbook.ActiveSheet;
            Range cell = (Range)activeSheet.Range["A1"];
            MessageBox.Show((String)cell.Value2);
 */
//            Globals.ThisAddIn.Connect();
            Globals.ThisAddIn.ShowSettingsForm();
        }

        private void button2_Click(object sender, EventArgs e)
        {
            Globals.ThisAddIn.ShowSettingsForm();
        }

        internal void SaveDocument()
        {
            if (!connected)
                _connect("");
            //
            webBrowser.Document.InvokeScript("onOfficeEvent", new object[] { "saveDocument" });
        }

        internal void onSelectionChange()
        {
            webBrowser.Document.InvokeScript("onOfficeEvent", new object[] { "selectionChanged" });
        }

        private void button1_Click_1(object sender, EventArgs e)
        {
            UnitTest_Tables test1 = new UnitTest_Tables();
            if (test1.Execute())
                MessageBox.Show("Succes");
            else
                MessageBox.Show("Fail");
        }
    }
}
