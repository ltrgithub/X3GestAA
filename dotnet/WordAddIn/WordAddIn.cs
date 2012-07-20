﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Xml.Linq;
using Word = Microsoft.Office.Interop.Word;
using Office = Microsoft.Office.Core;
using Microsoft.Office.Tools.Word;
using Microsoft.Office.Tools.Word.Extensions;
using System.Windows.Forms;

namespace WordAddIn
{
    public partial class WordAddIn
    {
        public BrowserDialog browserDialog;

        private void ThisAddIn_Startup(object sender, System.EventArgs e)
        {
            this.Application.DocumentChange += new Word.ApplicationEvents4_DocumentChangeEventHandler(on_document_changed);
        }

        private void ThisAddIn_Shutdown(object sender, System.EventArgs e)
        {
        }

        // Called when ever a document is opend by word
        public void on_document_changed()
        {
            Word.Document doc = this.Application.ActiveDocument;
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc);
            if (customData != null) // Document generated by X3 and supplied with additional data
            {
                if (customData.isRefreshDone() == false)
                {
                    DatasourceForm dsForm = new DatasourceForm(customData);
                    dsForm.ShowDialog();

                    customData.setRefreshDone(true);
                }
            }
        }

        public void connect()
        {
            if (browserDialog == null)
            {
                browserDialog = new BrowserDialog();
                browserDialog.connect("http://localhost:8124");
                browserDialog.Show();
            }
        }

        public void serverSettings()
        {
            ServerSettings settings = new ServerSettings();
            if (settings.ShowDialog() == DialogResult.OK)
            {
                String connectUrl = settings.GetConnectUrl();
            }
        }

        public void CreateMailMerge()
        {
            if (!connectedToServer())
            {
                return;
            }
            browserDialog.createMailMerge();
        }

        public Boolean connectedToServer() 
        {
            if (browserDialog == null)
            {
                connect();
            }
            return true;
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
