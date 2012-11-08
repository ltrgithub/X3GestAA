using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using System.Xml.Linq;
using Microsoft.Office.Interop.PowerPoint;
using Microsoft.Office.Interop.Excel;
//using Microsoft.Office.Tools.Excel;
using Microsoft.Office.Core;

namespace PowerPointAddIn
{
    public class NewSlideEventArgs
    {
        public Presentation pres;
        public SyracusePptCustomData customData;
        public DocumentWindow win;

        public NewSlideEventArgs(Presentation pres, SyracusePptCustomData customData, DocumentWindow win)
        {
            this.pres = pres;
            this.customData = customData;
            this.win = win;
        }
    }

    public partial class PowerPointAddIn
    {
        public const string pptx_action_new_slide = "new_slide";

        public delegate void NewSlideEvent(object sender, NewSlideEventArgs e);

        private event NewSlideEvent newSlide;

        private void ThisAddIn_Startup(object sender, System.EventArgs e)
        {
            Application.WindowActivate += new EApplication_WindowActivateEventHandler(Application_WindowActivate);
            newSlide += new NewSlideEvent(PowerPointAddIn_newSlideEvent);
        }

        private void ThisAddIn_Shutdown(object sender, System.EventArgs e)
        {
        }

        // Syracuse always serves a new document to PPT. This document does not contain usable content
        // but contains some kind of "command list" describing what actions have to be done inside PPT.
        // It is this way, because one probably never creates a whole new presentation based on an entity.
        // It is more likely, that one creates a new slide and attaches it to an already existing presentation.
        private void Application_WindowActivate(Presentation Pres, DocumentWindow Wn) {
            foreach (DocumentWindow w in Application.Windows)
            {
                try
                {
                    Presentation pres = w.Presentation;
                    SyracusePptCustomData cd = SyracusePptCustomData.getFromDocument(pres);
                    if (cd != null)
                    {
                        if (pptx_action_new_slide.Equals(cd.getCreateMode()))
                        {
                            if (cd.isForceRefresh())
                            {
                                cd.setForceRefresh(false);
                                cd.writeDictionaryToDocument();

                                // Invoke async outside the WindowActivate event, since not all operations are permitted in here 
                                newSlide.BeginInvoke(this, new NewSlideEventArgs(pres, cd, Wn), null, null);
                            }
                        }
                    }
                }
                catch (Exception e)
                {
                    MessageBox.Show(e.Message + ":" + e.StackTrace);
                }
            }
        }

        private void PowerPointAddIn_newSlideEvent(object sender, NewSlideEventArgs args)
        {
            try
            {
                PowerPointAddIn_newSlide(sender, args);
            }
            finally
            {
                // Close command presentation
                args.pres.Close();
            }
        }

        private void PowerPointAddIn_newSlide(object sender, NewSlideEventArgs args)
        {
            DocumentWindow selectedWindow = null;
            Presentation selectedPresentation = null;
            List<DocumentWindow> windows = new List<DocumentWindow>();
            foreach (DocumentWindow w in Application.Windows)
            {
                if (w.HWND != args.win.HWND)
                {
                    windows.Add(w);
                }
            }

            if (windows.Count >= 1)
            {
                PresentationSelectionDialog sel = new PresentationSelectionDialog(windows);
                DialogResult res = sel.ShowDialog();
                if (res == DialogResult.OK)
                {
                    selectedWindow = sel.selectedWindow;
                    selectedPresentation = selectedWindow.Presentation;
                }
            }
            else
            {
                // No presentation open yet
                selectedPresentation = Application.Presentations.Add();
            }

            if (selectedPresentation == null)
            {
                return;
            }
            if (selectedWindow == null)
            {
                foreach (DocumentWindow win in selectedPresentation.Windows)
                {
                    if (win.Active == MsoTriState.msoTrue)
                    {
                        selectedWindow = win;
                        break;
                    }
                }
            }
            if (selectedWindow == null)
            {
                return;
            }

            addChartSlide(selectedPresentation, selectedWindow, args.customData);
        }

        private void addChartSlide(Presentation pres, DocumentWindow win, SyracusePptCustomData cd)
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

                Microsoft.Office.Interop.PowerPoint.Shape sh = sl.Shapes.AddChart(Microsoft.Office.Core.XlChartType.xl3DColumn);//, 0, 0, 10, 10);
                Microsoft.Office.Interop.PowerPoint.Chart c = sh.Chart;

                c.ChartData.Activate();
                Workbook wb = (Workbook)c.ChartData.Workbook;
                Worksheet ws = (Worksheet)wb.Worksheets[1];
                try
                {
                    ws.ListObjects[1].Delete();
                    ws.Cells.Clear();
                    ws.Range["A1"].Select();
                }
                catch (Exception) { };

                COMAddIns addins = wb.Application.COMAddIns;
                if (addins != null)
                {
                    COMAddIn addin = addins.Item("Sage.Syracuse.ExcelAddIn");
                    if (addin != null && addin.Object != null)
                    {
                        //MessageBox.Show(cd.getServerUrl());
                        //MessageBox.Show(cd.getExcelData());
                        addin.Object.connectWorkbook(wb,
                            cd.getServerUrl(),
                            cd.getExcelData());
                        //c.Refresh();
                    }
                    else
                    {
                        // happens every 2nd time when addin a chart and closing excel afterwards
                        MessageBox.Show("no excel addin: " + (addin != null) + " utils: " + (addin.Object != null));
                    }
                }
                else
                {
                    MessageBox.Show("no excel addin");
                }
            }
            catch (Exception e)
            {
                MessageBox.Show(e.Message + ":" + e.StackTrace);
            }
        }

        #region Von VSTO generierter Code

        /// <summary>
        /// Erforderliche Methode für die Designerunterstützung.
        /// Der Inhalt der Methode darf nicht mit dem Code-Editor geändert werden.
        /// </summary>
        private void InternalStartup()
        {
            this.Startup += new System.EventHandler(ThisAddIn_Startup);
            this.Shutdown += new System.EventHandler(ThisAddIn_Shutdown);
        }
        
        #endregion
    }
}
