using System;
using System.Collections.Generic;
using System.Windows.Forms;
using System.Web.Script.Serialization;
using Microsoft.Office.Interop.Excel;

namespace ExcelAddIn
{
    public partial class ExcelTemplatePane : UserControl
    {
        public ExcelTemplatePane()
        {
            InitializeComponent();

            this.SizeChanged += new EventHandler(ExcelTemplatePane_SizeChanged);
            this.treeViewFields.NodeMouseDoubleClick += new TreeNodeMouseClickEventHandler(ExcelTemplatePane_NodeMouseDoubleClick);
            this.treeViewFields.ImageList = ReportingFieldUtil.getTypeImageList();
        }

        public void ExcelTemplatePane_SizeChanged(Object sender, EventArgs e)
        {
            treeViewFields.Size = this.Size;
        }

        public void ExcelTemplatePane_NodeMouseDoubleClick(Object sender, TreeNodeMouseClickEventArgs e)
        {
            Workbook workbook = Globals.ThisAddIn.Application.ActiveWorkbook;

            try
            {
                FieldTreeNode n = (FieldTreeNode)e.Node;

                if (n.item.ContainsKey("$bind"))
                {
                    string fieldName = n.item["$bind"].ToString();
                    Range rng = (Range)Globals.ThisAddIn.Application.ActiveCell;
                    workbook.Names.Add(fieldName, rng);
                }
            }
            catch (Exception ee)
            {
                MessageBox.Show(ee.Message + ":" + ee.StackTrace);
            }
        }
        
        public void clear()
        {
            treeViewFields.Nodes.Clear();
        }

        public void showFields(Workbook workbook)
        {
            clear();
            if (workbook == null)
                return;
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(workbook);
            if (customData == null)
                return;
            String layoutData = customData.getLayoutData();

            JavaScriptSerializer ser = new JavaScriptSerializer();
            Dictionary<String, object> layout = (Dictionary<String, object>)ser.DeserializeObject(layoutData);

            Object[] boxes = (Object[])layout["layout"];
            foreach (Object o in boxes)
            {
                try
                {
                    Dictionary<String, object> box = (Dictionary<String, object>)o;
                    String title = "<unknown>";
                    if (box.ContainsKey("$title"))
                    {
                        title = box["$title"].ToString();
                    }

                    FieldTreeNode node;
                    if (box.ContainsKey("$items"))
                    {
                        Dictionary<String, object> items = (Dictionary<String, object>)box["$items"];
                        String container = "box";

                        if (box.ContainsKey("$container"))
                        {
                            container = box["$container"].ToString();
                        }

                        node = new FieldTreeNode(title);
                        if (container.Equals("table"))
                        {
                            node.itemParent = box["$bind"].ToString();
                            node.ImageIndex = ReportingFieldUtil.getTypeImageListIndex(ReportingFieldTypes.TABLE);
                        }
                        else
                        {
                            node.ImageIndex = ReportingFieldUtil.getTypeImageListIndex(ReportingFieldTypes.BOX);
                        }
                        
                        
                        node.SelectedImageIndex = node.ImageIndex;

                        foreach (KeyValuePair<String, object> i in items)
                        {
                            Dictionary<String, Object> item = (Dictionary<String, Object>)i.Value;
                            if (!ReportingUtils.isSupportedType(item))
                                continue;

                            String hidden = item["$hidden"].ToString();
                            String ctitle = item["$title"].ToString();
                            String type = item["$type"].ToString();
                            String bind = item["$bind"].ToString();
                            
                            ReportingFieldTypes tft = ReportingFieldUtil.getType(type);
                            
                            FieldTreeNode child = new FieldTreeNode(ctitle, item);
                            child.itemParent = node.itemParent;
                            child.ImageIndex = ReportingFieldUtil.getTypeImageListIndex(tft);
                            child.SelectedImageIndex = child.ImageIndex;

                            node.Nodes.Add(child);
                        }

                        if (node.Nodes.Count > 0)
                            treeViewFields.Nodes.Add(node);
                    }
                }
                catch (Exception) { }
            }

            treeViewFields.ExpandAll();
        }
    }

    public class FieldTreeNode : TreeNode
    {
        public Dictionary<String, Object> item;
        public String itemParent;

        public FieldTreeNode(String title)
            : base(title)
        {
        }
        public FieldTreeNode(String title, Dictionary<String, Object> item)
            : base(title)
        {
            this.item = item;
        }
    };


}
