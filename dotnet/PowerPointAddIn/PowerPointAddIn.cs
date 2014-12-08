﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using System.Xml.Linq;
using Microsoft.Office.Interop.PowerPoint;
using Microsoft.Office.Core;
using Microsoft.Win32;
using CommonDataHelper;
using CommonDataHelper.HttpHelper;

namespace PowerPointAddIn
{
    public partial class PowerPointAddIn
    {
        public const string pptx_action_new_chart_slide = "new_chart_slide";

        public PptActions pptActions;
        public BrowserDialog browserDialog;
        public CommonUtils common;
        public Boolean newVersionMessage = false;

        private void ThisAddIn_Startup(object sender, System.EventArgs e)
        {
            browserDialog = new BrowserDialog();
            common = new CommonUtils(browserDialog);
            pptActions = new PptActions(browserDialog);

            Application.WindowActivate += new EApplication_WindowActivateEventHandler(Application_WindowActivate);
            Application.SlideSelectionChanged += new EApplication_SlideSelectionChangedEventHandler(Application_SlideSelectionChanged);
            //Application.PresentationBeforeClose += new EApplication_PresentationBeforeCloseEventHandler(on_PresentationBeforeClose);
            Application.PresentationBeforeSave += new EApplication_PresentationBeforeSaveEventHandler(on_PresentationBeforeSave);

            common.DisplayServerLocations();
            RibbonHelper.ButtonDisconnect = Globals.Ribbons.Ribbon.buttonDisconnect;
        }

        public void on_PresentationBeforeSave(Presentation Pres, ref bool Cancel)
        {
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(Pres);
            if (customData != null)
            {
                if ((!string.IsNullOrEmpty(customData.getDocumentUrl())) &&
                    (MessageBox.Show(String.Format(global::PowerPointAddIn.Properties.Resources.MSG_SAVE_AS),
                    global::PowerPointAddIn.Properties.Resources.MSG_SAVE_AS_TITLE, MessageBoxButtons.YesNo) == DialogResult.No))
                {
                    Cancel = true;
                }
            }
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
                    SyracuseOfficeCustomData cd = SyracuseOfficeCustomData.getFromDocument(pres);
                    if ((cd != null) && (!cd.getServerUrl().Equals(String.Empty)))
                    {
                        BaseUrlHelper.CustomData = cd;
                        if (string.IsNullOrEmpty(cd.getCookie()) == false)
                        {
                            CookieHelper.setCookies(cd.getCookie());
                            if (CookieHelper.CookieContainer.Count != 0)
                            {
                                new ConnectionDialog().connectToServer();
                            }
                        }

                        BaseUrlHelper.BaseUrl = new Uri(cd.getServerUrl());
                        string docUrl = cd.getDocumentUrl();
                        if (docUrl != null && !"".Equals(docUrl))
                        {
                            Globals.Ribbons.Ribbon.buttonPublish.Enabled = true;
                        }
                        else
                        {
                            Globals.Ribbons.Ribbon.buttonPublish.Enabled = false;
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
                        Globals.Ribbons.Ribbon.buttonPublish.Enabled = false;
                    }
                }
                catch (Exception e)
                {
                    MessageBox.Show(e.Message + ":" + e.StackTrace);
                }
            }
            pptActions.checkRefreshButtons();
            common.DisplayServerLocations();
        }

        private void PowerPointAddIn_newSlide(Presentation pres, SyracuseOfficeCustomData customData, DocumentWindow win)
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
            try
            {
                pres.Close();
            }
            catch (Exception) { }
        }

        private void PowerPointAddIn_addNewSlide(Presentation pres, SyracuseOfficeCustomData customData, DocumentWindow win)
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

        public void on_PresentationBeforeClose(Presentation pres, ref bool Cancel)
        {
            pptActions.closeConnectionsAllSlides();
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
