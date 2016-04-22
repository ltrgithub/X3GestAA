using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Diagnostics;
using System.Runtime.InteropServices.ComTypes;
using System.Runtime.InteropServices;
using Microsoft.Office.Interop.Excel;
using Microsoft.Office.Tools.Ribbon;
using Microsoft.VisualStudio.OLE.Interop;

namespace ExcelAddIn
{
    public static class EmbeddedHelper
    {
        /// <summary>
        /// Set the visibility of the Syracuse tab.
        /// </summary>
        /// <param name="show"></param>
        public static void setSyracuseTabVisibility(bool show)
        {
            foreach (RibbonTab ribbonTab in Globals.Ribbons.Ribbon.Tabs)
            {
                if (ribbonTab.Name.Equals("syracuseTab"))
                {
                    ribbonTab.Visible = show;
                    break;
                }
            }
        }

        /// <summary>
        /// Checks to see if the Workbook is embedded inside of aother ActiveX Document
        /// </summary>
        /// <param name="Wb"></param>
        /// <returns></returns>
        public static bool IsEmbedded(Workbook Wb)
        {
            bool isEmbedded = false;

            if (Wb != null && (Wb.Path == null || Wb.Path.Length == 0))
            {
                try
                {
                    IOleObject oleObject = ((object)Wb) as IOleObject;
                    IOleClientSite ppClientSite;

                    oleObject.GetClientSite(out ppClientSite);
                    if (ppClientSite != null || Wb.IsInplace || Wb.Name == "Object" || Wb.Name.IndexOf("Workbook in") != -1 || Wb.Name.IndexOf("Chart in") != -1)
                    {
                        isEmbedded = true;
                    }
                 }
                catch (Exception) {}
            }
            return isEmbedded;
        }
    }
}
