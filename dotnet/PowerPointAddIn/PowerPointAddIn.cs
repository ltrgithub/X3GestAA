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
    public partial class PowerPointAddIn
    {
        private void ThisAddIn_Startup(object sender, System.EventArgs e)
        {
            Application.WindowActivate += new EApplication_WindowActivateEventHandler(Application_WindowActivate);
        }

        private void ThisAddIn_Shutdown(object sender, System.EventArgs e)
        {
        }

        private void Application_WindowActivate(Presentation Pres, DocumentWindow Wn) {
            foreach (DocumentWindow w in Application.Windows)
            {
                SyracusePptCustomData cd = SyracusePptCustomData.getFromDocument(w.Presentation, true);
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
