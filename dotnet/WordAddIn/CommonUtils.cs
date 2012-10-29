using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using Microsoft.Office.Interop.Word;

namespace WordAddIn
{
    public class CommonUtils
    {
        public BrowserDialog browserDialog = null;

        public CommonUtils(BrowserDialog browserDialog)
        {
            this.browserDialog = browserDialog;
        }

        // Save a document that has already been published
        public void Save(Document doc)
        {
            // A document that has not been published yet cannot be saved using the save button, the user must use Save as...
            // The button should not be active in this case, this is just for safety reasons
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc);
            if (customData == null)
            {
                ShowInfoMessage(global::WordAddIn.Properties.Resources.MSG_DOC_NOT_PUBLISHED, global::WordAddIn.Properties.Resources.MSG_DOC_NOT_PUBLISHED_TITLE);
                SaveAs(doc);
                return;
            }
            if ("".Equals(customData.getDocumentUrl()))
            {
                ShowInfoMessage(global::WordAddIn.Properties.Resources.MSG_DOC_NOT_PUBLISHED, global::WordAddIn.Properties.Resources.MSG_DOC_NOT_PUBLISHED_TITLE);
                SaveAs(doc);
                return;
            }
            // ---

            browserDialog.loadPage("/msoffice/lib/word/ui/save.html?url=%3Frepresentation%3Dwordsave.%24dashboard", customData);
        }

        // Save a document as new document (e.g. create a copy of a already published document or save a not yet published doc.)
        public void SaveAs(Document doc)
        {
            SyracuseOfficeCustomData customData = PrepareToSaveNewDoc(doc);
            browserDialog.loadPage("/msoffice/lib/word/ui/save.html?url=%3Frepresentation%3Dwordsave.%24dashboard", customData);
        }

        private static SyracuseOfficeCustomData PrepareToSaveNewDoc(Document doc)
        {
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc);
            if (customData == null)
            {
                customData = SyracuseOfficeCustomData.getFromDocument(doc, true);
                customData.setCreateMode("plain_doc");
                customData.setForceRefresh(false);
            }
            else
            {
                // Since we want to save a new independent doc to collab. space, an eventually set URL has to be removed first
                customData.setDocumentUrl("");
                customData.setDocumentTitle("");
                customData.setForceRefresh(false);
            }
            customData.writeDictionaryToDocument();
            return customData;
        }

        public static void ShowErrorMessage(string text)
        {
            MessageBox.Show(text, global::WordAddIn.Properties.Resources.MSG_ERROR_TITLE, MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        public static void ShowInfoMessage(string text, string title)
        {
            MessageBox.Show(text, title, MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
    }
}
