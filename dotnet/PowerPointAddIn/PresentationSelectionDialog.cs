using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using Microsoft.Office.Interop.PowerPoint;
using Microsoft.Office.Core;

namespace PowerPointAddIn
{
    public partial class PresentationSelectionDialog : Form
    {
        public DocumentWindow selectedWindow;
        List<DocumentWindow> windows;

        public PresentationSelectionDialog(List<DocumentWindow> windows)
        {
            InitializeComponent();
            this.windows = windows;

            foreach (DocumentWindow w in windows)
            {
                listWindows.Items.Add(w.Presentation.Name);
            }

            listWindows.SelectedIndex = 0;
        }

        private void buttonOk_Click(object sender, EventArgs e)
        {
            if (listWindows.SelectedIndex < 0)
            {
                
            }
            selectedWindow = windows[listWindows.SelectedIndex];
        }

        private void buttonCancel_Click(object sender, EventArgs e)
        {
        }

        private void listWindows_DoubleClick(object sender, EventArgs e)
        {
            if (listWindows.SelectedIndex < 0)
            {

            }
        }

        private void listWindows_SelectedIndexChanged(object sender, EventArgs e)
        {
            if (listWindows.SelectedIndex < 0)
            {
                buttonOk.Enabled = false;
            }
            else
            {
                buttonOk.Enabled = true;
            }
        }

        public int getSlideIndex()
        {
            if (radioButtonFirst.Checked)
                return -1;
            if (radioButtonLast.Checked)
                return 1;
            return 0;
        }
    }
}
