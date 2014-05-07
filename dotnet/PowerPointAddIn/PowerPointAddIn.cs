using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using System.Xml.Linq;
using Microsoft.Office.Interop.PowerPoint;
using Microsoft.Office.Core;
using Microsoft.Win32;

namespace PowerPointAddIn
{
    public partial class PowerPointAddIn
    {
        public const string pptx_action_new_chart_slide = "new_chart_slide";

        public PptActions pptActions;
        public BrowserDialog browserDialog;
        public CommonUtils common;
        public Boolean newVersionMessage = false;
        public int versionNumberBinary = 0;

        private void ThisAddIn_Startup(object sender, System.EventArgs e)
        {
            browserDialog = new BrowserDialog();
            common = new CommonUtils(browserDialog);
            pptActions = new PptActions(browserDialog);

            Application.WindowActivate += new EApplication_WindowActivateEventHandler(Application_WindowActivate);
            Application.SlideSelectionChanged += new EApplication_SlideSelectionChangedEventHandler(Application_SlideSelectionChanged);
        }

        private void ThisAddIn_Shutdown(object sender, System.EventArgs e)
        {
        }

        // Syracuse always serves a new document to PPT. This document does not contain usable content
        // but contains some kind of "command list" describing what actions have to be done inside PPT.
        // It is this way, because one probably never creates a whole new presentation based on an entity.
        // It is more likely, that one creates a new slide and attaches it to an already existing presentation.
        private void Application_WindowActivate(Presentation Pres, DocumentWindow Wn) 
        {
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

                                PowerPointAddIn_newSlide(pres, cd, Wn);
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

        private void PowerPointAddIn_newSlide(Presentation pres, PptCustomData customData, DocumentWindow win)
        {
            try
            {
                PowerPointAddIn_addNewSlide(pres, customData, win);
            }
            finally
            {
                pptActions.checkRefreshButtons();

                // We can't close the presentation on from the main thread, so close it on this new thread.
                System.Threading.Thread t = new System.Threading.Thread(() => PowerPointAddIn_closePresentation(pres));
                t.SetApartmentState(System.Threading.ApartmentState.STA);
                t.Start();
            }
        }

        private void PowerPointAddIn_closePresentation(Presentation pres)
        {
            // Close command presentation
            pres.Close();
        }

        private void PowerPointAddIn_addNewSlide(Presentation pres, PptCustomData customData, DocumentWindow win)
        {
            DocumentWindow selectedWindow = null;
            Presentation selectedPresentation = null;
            List<DocumentWindow> windows = new List<DocumentWindow>();
            foreach (DocumentWindow w in Application.Windows)
            {
                if (w.HWND != win.HWND)
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
                foreach (DocumentWindow docWin in selectedPresentation.Windows)
                {
                    if (docWin.Active == MsoTriState.msoTrue)
                    {
                        selectedWindow = docWin;
                        break;
                    }
                }
            }
            if (selectedWindow == null)
            {
                return;
            }

            pptActions.addChartSlide(selectedPresentation, selectedWindow, customData, slideIndex);
        }

        void Application_SlideSelectionChanged(SlideRange SldRange)
        {
            pptActions.checkRefreshButtons();
        }

        public string getInstalledAddinVersion()
        {
            String addinVersion = "0.0.0";
            RegistryKey regLM = Registry.LocalMachine;
            RegistryKey installerProductKey = regLM.OpenSubKey("SOFTWARE\\Classes\\Installer\\Products");
            foreach (string subKeyName in installerProductKey.GetSubKeyNames())
            {
                using (RegistryKey sk = installerProductKey.OpenSubKey(subKeyName))
                {
                    foreach (string valueName in sk.GetValueNames())
                    {
                        if (valueName == "ProductName")
                        {
                            if (sk.GetValue(valueName).ToString() == "Sage ERP X3 Office Addins")
                            {
                                Object decVersion = sk.GetValue("Version");
                                int v = Convert.ToInt32(decVersion.ToString());
                                versionNumberBinary = v;
                                String vr = ((v & 0xFF000000) >> 24) + "." + ((v & 0x00FF0000) >> 16) + "." + (v & 0x0000FFFF);
                                addinVersion = vr;
                                break;
                            }
                        }
                    }
                    sk.Close();
                }
            }

            installerProductKey.Close();
            regLM.Close();
            return addinVersion;
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
