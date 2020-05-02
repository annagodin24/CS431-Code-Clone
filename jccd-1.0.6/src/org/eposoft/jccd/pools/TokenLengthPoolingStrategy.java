package org.eposoft.jccd.pools;

import java.util.TreeMap;
import java.util.Vector;

import org.eposoft.jccd.data.APool;
import org.eposoft.jccd.data.PoolDouble;
import org.eposoft.jccd.data.PoolSingle;
import org.eposoft.jccd.data.ast.ANode;
import org.eposoft.jccd.data.ast.ASTManager;
import org.eposoft.jccd.preprocessors.java.NodeCountAnnotator;
import org.eposoft.jccd.preprocessors.java.TokenLengthAnnotator;
import org.eposoft.jccd.preprocessors.java.TokenTypesAnnotator;

/**
 * Nodes with same distance to the leaf, same subnode-amount, child amount and
 * at least 50 tokens can be found in one pool. All pools are ordered ascending.
 * Leafs and nodes with distance of 0 will be ignored.
 * 
 * @author biegel
 */
public class TokenLengthPoolingStrategy extends APoolingStrategy<ASTManager> {

	/**
	 * nodes of the first revision pooled and ordered by depth and
	 * subnode-count.
	 */
	private TreeMap<TokenLengthComparable, Vector<ANode>> firstMap = null;

	/**
	 * nodes of the second revision pooled and ordered by depth and
	 * subnode-count.
	 */
	private TreeMap<TokenLengthComparable, Vector<ANode>> secondMap = null;

	@Override
	public APool[] getPools(ASTManager firstContainer,
			ASTManager secondContainer) {
		if ((null == firstContainer) || (null == firstContainer.getRoot())
				|| (0 == firstContainer.getRoot().getChildCount())) {
			return null;
		}

		this.firstMap = new TreeMap<TokenLengthComparable, Vector<ANode>>();
		this.secondMap = new TreeMap<TokenLengthComparable, Vector<ANode>>();

		ANode root = firstContainer.getRoot();
		for (int i = 0; i < root.getChildCount(); i++) {
			fillPools(root.getChild(i), true);
		}
		// fillPools(firstContainer.getRoot(), true);

		if (null != secondContainer) {
			root = secondContainer.getRoot();
			for (int i = 0; i < root.getChildCount(); i++) {
				fillPools(root.getChild(i), false);
			}
			// fillPools(secondContainer.getRoot(), false);
		}

		// build pools
		Vector<APool> pools = new Vector<APool>();
		for (final TokenLengthComparable key : this.firstMap.keySet()) {
			final Vector<ANode> firstNodes = this.firstMap.get(key);
			final Vector<ANode> secondNodes = this.secondMap.get(key);

			final APool newPool;
			// single version mode?
			if (null == secondContainer) {
				newPool = new PoolSingle();
			} else {
				// two version mode
				if (null == secondNodes) {
					continue;
				}
				newPool = new PoolDouble();
				for (final ANode candidate : secondNodes) {
					((PoolDouble) newPool).addSecondRevisionNode(candidate);
				}
			}

			for (final ANode candidate : firstNodes) {
				newPool.addFirstRevisionNode(candidate);
			}

			pools.add(newPool);
		}

		// free maps
		this.firstMap = null;
		this.secondMap = null;

		final APool[] poolArr = new APool[pools.size()];
		return pools.toArray(poolArr);
	}

	@Override
	public APool[] getPools(ASTManager container) {
		return this.getPools(container, null);
	}

	/**
	 * Walks recursive through the tree and divides the nodes in different
	 * pools.
	 * 
	 * @param tree
	 *            any node of the tree
	 * @param isFirstRevision
	 *            fill pools of the first revision?
	 */
	private void fillPools(final ANode tree, final boolean isFirstRevision) {
		// only nodes with tokens amount value will be added to the pool
		final Integer tokens = (Integer) tree.getAnnotation(
				TokenLengthAnnotator.class, "tokens");
		final Integer tokentypes = (Integer) tree.getAnnotation(
				TokenTypesAnnotator.class, "tokentypes");
		// if (!tree.isRoot()) {
		if ((null == tokens) || (null == tokentypes)) {
			return;
		}
		// }

		final TokenLengthComparable poolMember = new TokenLengthComparable(tree);
		final TreeMap<TokenLengthComparable, Vector<ANode>> pools;
		if (isFirstRevision) {
			pools = this.firstMap;
		} else {
			pools = this.secondMap;
		}
		Vector<ANode> pool = pools.get(poolMember);
		if (null == pool) {
			pool = new Vector<ANode>();
		}

		pool.add(poolMember.getTree());
		pools.put(poolMember, pool);

		if (0 == tree.getChildCount()) {
			return;
		}

		for (int i = 0; i < tree.getChildCount(); i++) {
			final ANode child = tree.getChild(i);
			this.fillPools(child, isFirstRevision);
		}
	}
}

/**
 * Contains an AST-node which will be sorted in a tree map. (ascending by depth)
 * 
 * @author biegel
 */
final class TokenLengthComparable implements Comparable<TokenLengthComparable> {

	/** any node of the AST */
	private final ANode tree;

	/**
	 * Standard constructor.
	 * 
	 * @param tree
	 *            any node of the AST
	 */
	public TokenLengthComparable(final ANode tree) {
		this.tree = tree;
	}

	/**
	 * @return the tree
	 */
	public ANode getTree() {
		return this.tree;
	}

	/**
	 * Computes an identifier composed of depth, class name, nodes amount etc.
	 * 
	 * @return unique group identifier of this kind of AST-nodes
	 */
	private String computeIdentifier() {
		final StringBuffer sb = new StringBuffer();
		// sb.append(this.tree.getAnnotation(DepthAnnotator.class, "height"));
		// sb.append('|');
		sb.append(this.tree.getAnnotation(NodeCountAnnotator.class, "nodes"));
		sb.append('|');
		sb.append(tree.getChildCount());
		// sb.append('|');
		// sb.append(tree.getType());
		// sb.append('|');
		// sb.append(tree.getText());
		return sb.toString();
	}

	@Override
	public int hashCode() {
		final String identifier = this.computeIdentifier();
		if (null == identifier) {
			return 0;
		}

		return identifier.hashCode();
	}

	@Override
	public boolean equals(Object o) {
		if (o instanceof TokenLengthComparable) {
			return (hashCode() == o.hashCode());
		}
		return false;
	}

	@Override
	public int compareTo(TokenLengthComparable o) {
		return this.computeIdentifier().compareTo(o.computeIdentifier());
	}

	@Override
	public String toString() {
		return computeIdentifier();
	}

}
