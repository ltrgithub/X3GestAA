using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using System.Xml.Linq;
using Microsoft.Office.Interop.PowerPoint;
using Microsoft.Office.Core;

namespace PowerPointAddIn
{
    public class NewSlideEventArgs
    {
        public Presentation pres;
        public PptCustomData customData;
        public DocumentWindow win;

        public NewSlideEventArgs(Presentation pres, PptCustomData customData, DocumentWindow win)
        {
            this.pres = pres;
            this.customData = customData;
            this.win = win;
        }
    }

    public partial class PowerPointAddIn
    {
        public const string pptx_action_new_chart_slide = "new_chart_slide";

        public delegate void NewSlideEvent(object sender, NewSlideEventArgs e);
        private event NewSlideEvent newSlide;

        public PptActions pptActions;
        public BrowserDialog browserDialog;
        public CommonUtils common;

        private void ThisAddIn_Startup(object sender, System.EventArgs e)
        {
            browserDialog = new BrowserDialog();
            common = new CommonUtils(browserDialog);
            pptActions = new PptActions(browserDialog);

            Application.WindowActivate += new EApplication_WindowActivateEventHandler(Application_WindowActivate);
            Application.SlideSelectionChanged += new EApplication_SlideSelectionChangedEventHandler(Application_SlideSelectionChanged);
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
                    PptCustomData cd = PptCustomData.getFromDocument(pres);
                    if (cd != null)
                    {
                        string docUrl = cd.getDocumentUrl();
                        if (docUrl != null && !"".Equals(docUrl))
                        {
                            Globals.Ribbons.Ribbon.buttonSave.Enabled = true;
                        }
                        else
                        {
                            Globals.Ribbons.Ribbon.buttonSave.Enabled = false;
                        }
                        if (pptx_action_new_chart_slide.Equals(cd.getActionType()))
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
                    else
                    {
                        Globals.Ribbons.Ribbon.buttonSave.Enabled = false;
                    }
                }
                catch (Exception e)
                {
                    MessageBox.Show(e.Message + ":" + e.StackTrace);
                }
            }
            pptActions.checkRefreshButtons();
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
                pptActions.checkRefreshButtons();
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
            int slideIndex = 1;
            if (windows.Count >= 1)
            {
                PresentationSelectionDialog sel = new PresentationSelectionDialog(windows);
                DialogResult res = sel.ShowDialog();
                if (res == DialogResult.OK)
                {
                    selectedWindow = sel.selectedWindow;
                    selectedPresentation = selectedWindow.Presentation;
                    slideIndex = sel.getSlideIndex();
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

            pptActions.addChartSlide(selectedPresentation, selectedWindow, args.customData, slideIndex);
        }

        void Application_SlideSelectionChanged(SlideRange SldRange)
        {
            pptActions.checkRefreshButtons();
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
