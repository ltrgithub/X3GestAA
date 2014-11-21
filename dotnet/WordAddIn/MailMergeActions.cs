﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Office.Interop.Word;

namespace WordAddIn
{
    public class MailMergeActions
    {
        public BrowserDialog browserDialog = null;

        public MailMergeActions(BrowserDialog browserDialog)
        {
            this.browserDialog = browserDialog;
        }

        public static Boolean isMailMergeDocument(Document doc)
        {
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc);
            if (customData != null)
            {
                String mode = customData.getCreateMode();
                if ("1".Equals(mode) || "2".Equals(mode) || "3".Equals(mode))
                {
                    return true;
                }
            }
            return false;
        }

        public void ActiveDocumentChanged(Document doc)
        {
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc);
            if (customData != null) // Document generated by X3 and supplied with additional data
            {
                // 1: New empty document
                // 2: New document by Word template
                // 3: Use existing template
                String mode = customData.getCreateMode();
                if ("2".Equals(mode))
                {
                    CreateNewMailMergeDocument(doc, customData);
                }
                else if ("1".Equals(mode) || "3".Equals(mode))
                {
                    if (customData.isForceRefresh())
                    {
                        CreateMailMerge(doc, customData);
                    }
                    Globals.Ribbons.Ribbon.RibbonUI.ActivateTabMso("TabAddIns");
                }
            }
        }

        public void CreateNewMailMergeDocument(Document doc, SyracuseOfficeCustomData customData)
        {
            String name = doc.Name;

            // close dummy doc served by syracuse
            ((_Document)doc).Close(false);

            // Open new file wizard
            if (Globals.WordAddIn.Application.Dialogs[WdWordDialog.wdDialogFileNew].Show() != -1)
            {
                // Creating document cancelled
                return;
            }

            Document newDoc = Globals.WordAddIn.Application.ActiveDocument;

            // Propose name for save dialog
            newDoc.BuiltInDocumentProperties[WdBuiltInProperty.wdPropertyTitle] = name;

            // Create new custom data for document
            SyracuseOfficeCustomData newCustomData = SyracuseOfficeCustomData.getFromDocument(newDoc, true);
            newCustomData.setDictionary(customData.getDictionary());
            newCustomData.setCreateMode("3");
            newCustomData.writeDictionaryToDocument();

            CreateMailMerge(newDoc, newCustomData);
        }

        public void CreateMailMerge(Document doc, SyracuseOfficeCustomData customData)
        {
            WordAddInJSExternal external = new WordAddInJSExternal(customData, browserDialog);
            customData.setForceRefresh(false);
            customData.setDocumentUrl("");
            customData.writeDictionaryToDocument();
            browserDialog.loadPage("msoffice/lib/word/ui/main.html?url=%3Frepresentation%3Dwordhome.%24dashboard", external);
        }
    }
}
