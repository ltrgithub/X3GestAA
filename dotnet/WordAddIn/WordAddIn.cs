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
        public SyracuseTemplatePane templatePane;
        public Microsoft.Office.Tools.CustomTaskPane customTemplatePane;
        private String connectUrl;

        public BrowserDialog browserDialog = null;

        private void ThisAddIn_Startup(object sender, System.EventArgs e)
        {
            this.templatePane = new SyracuseTemplatePane();
            this.customTemplatePane = this.CustomTaskPanes.Add(templatePane, "Template fields");
            this.customTemplatePane.VisibleChanged += SyracuseTemplatePane_VisibleChanged;

            this.Application.DocumentChange += new Word.ApplicationEvents4_DocumentChangeEventHandler(on_document_changed);
        }

        private void ThisAddIn_Shutdown(object sender, System.EventArgs e)
        {

        }
        void on_document_before_save(object sender, Microsoft.Office.Tools.Word.SaveEventArgs e)
        {
            if (MessageBox.Show("Do you want to save the document?", "BeforeSave",
                MessageBoxButtons.YesNo) == DialogResult.No)
            {
                e.Cancel = true;
            }
        }

        // Called when ever a document is opend by word or one is activated
        public void on_document_changed()
        {
            if (this.Application == null)
                return;
            if (this.Application.Documents.Count <= 0)
                return;

            Globals.Ribbons.Ribbon.buttonCreateMailMerge.Enabled = true;
            Word.Document doc = this.Application.ActiveDocument;

            Globals.Ribbons.Ribbon.buttonCreateMailMerge.Enabled = false;
            Globals.Ribbons.Ribbon.buttonPreview.Enabled = false;

            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc);
            if (customData != null) // Document generated by X3 and supplied with additional data
            {
                String mode = customData.getCreateMode();
                if ("2".Equals(mode))
                {
                    CreateNewMailMergeDocument();
                }
                else if ("4".Equals(mode))
                {
                    if (customData.isForceRefresh())
                    {
                        CreateWordReportTemplate();
                    }
                    Globals.Ribbons.Ribbon.buttonPreview.Enabled = true;
                }
                else if ("5".Equals(mode))
                {
                    if (customData.isForceRefresh())
                    {
                        PopulateWordReportTemplate();
                    }
                }
                else if (!"".Equals(mode))
                {
                    if (customData.isForceRefresh())
                    {
                        CreateMailMerge(doc);
                    }
                }
            }
            
            RefreshTemplatePane();
        }

        public void Connect()
        {
            if (browserDialog == null)
            {
                browserDialog = new BrowserDialog();
                if (connectUrl == null)
                {
                    connectUrl = "http://localhost:8124";
                }
                browserDialog.Connect(connectUrl);
            }
        }

        public void ServerSettings()
        {
            ServerSettings settings = new ServerSettings(connectUrl);
            if (settings.ShowDialog() == DialogResult.OK)
            {
                connectUrl = settings.GetConnectUrl();
            }
        }

        public void CreateNewMailMergeDocument()
        {
            Word.Document doc = this.Application.ActiveDocument;
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc);
            if (customData == null)
            {
                return;
            }

            String name = doc.Name;

            // close dummy doc served by syracuse
            ((Word._Document) doc).Close(false);

            // Open new file wizard
            if (Application.Dialogs[Word.WdWordDialog.wdDialogFileNew].Show() != -1)
            {
                // Creating document cancelled
                return;
            }

            Word.Document newDoc = this.Application.ActiveDocument;

            // Propose name for save dialog
            newDoc.BuiltInDocumentProperties[Word.WdBuiltInProperty.wdPropertyTitle] = name;

            // Create new custom data for document
            SyracuseOfficeCustomData newCustomData = SyracuseOfficeCustomData.getFromDocument(newDoc, true);
            newCustomData.setDictionary(customData.getDictionary());
            newCustomData.setCreateMode("3");
            newCustomData.writeDictionaryToDocument();
            CreateMailMerge(newDoc);

            Globals.Ribbons.Ribbon.buttonCreateMailMerge.Enabled = false;
        }

        public void CreateWordReportTemplate()
        {
            Word.Document doc = this.Application.ActiveDocument;
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc);
            if (customData == null)
            {
                return;
            }
            connectUrl = customData.getServerUrl();
            if (!ConnectedToServer())
            {
                return;
            }

            customData.setForceRefresh(false);
            customData.writeDictionaryToDocument();

            browserDialog.CreateWordReportTemplate(doc);

            Globals.Ribbons.Ribbon.buttonCreateMailMerge.Enabled = false;
        }

        public void PopulateWordReportTemplate()
        {
            Word.Document doc = this.Application.ActiveDocument;
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc);
            if (customData == null)
            {
                return;
            }

            connectUrl = customData.getServerUrl();
            if (!ConnectedToServer())
            {
                return;
            }

            customData.setForceRefresh(false);
            customData.writeDictionaryToDocument();

            browserDialog.PopulateWordReportTemplate(doc);

            Globals.Ribbons.Ribbon.buttonCreateMailMerge.Enabled = false;
        }

        public void CreateWordReportPreview()
        {
            Word.Document doc = this.Application.ActiveDocument;
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc);
            if (customData == null)
            {
                return;
            }
            String mode = customData.getCreateMode();
            if (!"4".Equals(mode))
            {
                return;
            }

            if (!ConnectedToServer())
            {
                return;
            }

            String layout = customData.getLayoutData();
            doc.Range().Copy();
            doc = Application.Documents.Add();
            doc.Range().Paste();
            browserDialog.preparePreview(doc);
            ReportingUtils.fillTemplate(doc, customData.getLayoutData(), browserDialog);
        }

        // Add MailMerge DS to active Document after selecting DS
        public void CreateMailMerge(Word.Document doc)
        {
            if (!ConnectedToServer())
            {
                return;
            }
            browserDialog.CreateMailMergeDocument(doc);
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc);
            if (customData != null)
            {
                customData.setForceRefresh(false);
                customData.writeDictionaryToDocument();
            }
        }

        public void SaveDocumentToX3(Word.Document doc)
        {
            if (!ConnectedToServer())
            {
                return;
            }
            browserDialog.SaveDocumentToX3(doc);
        }
        
        public Boolean ConnectedToServer() 
        {
            if (browserDialog == null)
            {
                Connect();
            }
            return true;
        }

        public void RefreshTemplatePane()
        {
            if (this.Application.Documents.Count <= 0)
                return;

            Word.Document doc = this.Application.ActiveDocument;
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc);
            if (customData == null)
            {
                templatePane.clear();
                return;
            }
            if (!"4".Equals(customData.getCreateMode())) 
            {
                templatePane.clear();
                return;
            }
            templatePane.showFields(customData.getLayoutData());
        }

        private void SyracuseTemplatePane_VisibleChanged(object sender, EventArgs e)
        {
            Microsoft.Office.Tools.CustomTaskPane taskPane = sender as Microsoft.Office.Tools.CustomTaskPane;
            if (taskPane != null)
            {
                if (taskPane.Visible)
                {
                    Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Checked = true;
                }
                else
                {
                    Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Checked = false;
                }
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
